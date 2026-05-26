import protobuf from 'protobufjs';
import { decodeOtlpLogs } from '../../../tools/logs/otlpLogs';
import { OTLP_LOGS_PROTO } from '../../../tools/logs/otlpProto';

// Encode a known ExportLogsServiceRequest with the SAME schema a real OTLP
// producer uses, then assert the decoder recovers it as canonical JSON.
function encodeSample(): Uint8Array {
  const root = protobuf.parse(OTLP_LOGS_PROTO).root;
  const Req = root.lookupType(
    'opentelemetry.proto.logs.v1.ExportLogsServiceRequest',
  );
  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'E19.100' } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'default' },
            logRecords: [
              {
                severityNumber: 17,
                severityText: 'Error',
                body: { stringValue: 'Error when opening connection' },
                attributes: [
                  {
                    key: 'sap.calm.service.lms_id',
                    value: { stringValue: 'svc-1' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  return Req.encode(Req.create(payload)).finish();
}

describe('decodeOtlpLogs', () => {
  it('decodes an OTLP protobuf payload into canonical JSON', () => {
    const json = decodeOtlpLogs(encodeSample()) as {
      resourceLogs: Array<{
        resource: { attributes: Array<{ key: string; value: unknown }> };
        scopeLogs: Array<{
          scope: { name: string };
          logRecords: Array<{
            severityText: string;
            body: { stringValue: string };
          }>;
        }>;
      }>;
    };
    const rl = json.resourceLogs[0];
    expect(rl.resource.attributes[0]).toEqual({
      key: 'service.name',
      value: { stringValue: 'E19.100' },
    });
    const rec = rl.scopeLogs[0].logRecords[0];
    expect(rec.severityText).toBe('Error');
    expect(rec.body).toEqual({ stringValue: 'Error when opening connection' });
    expect(rl.scopeLogs[0].scope.name).toBe('default');
  });

  it('throws a typed error on bytes that are not OTLP', () => {
    // Random non-protobuf bytes — decode should fail loudly, not silently
    // return garbage.
    const garbage = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(() => decodeOtlpLogs(garbage)).toThrow();
  });
});
