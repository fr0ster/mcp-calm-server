import protobuf from 'protobufjs';
import { OTLP_LOGS_PROTO } from './otlpProto';

// Parse the embedded OTLP schema once and reuse the resolved type.
let cachedType: protobuf.Type | undefined;
function exportRequestType(): protobuf.Type {
  if (!cachedType) {
    const root = protobuf.parse(OTLP_LOGS_PROTO).root;
    cachedType = root.lookupType(
      'opentelemetry.proto.logs.v1.ExportLogsServiceRequest',
    );
  }
  return cachedType;
}

/**
 * Decode a Cloud ALM Logs OTLP `application/x-protobuf` body into canonical
 * OTLP JSON (`{ resourceLogs: [{ resource, scopeLogs: [...] }] }`).
 *
 * `int64`/`fixed64` fields are emitted as decimal strings (JS numbers can't
 * hold nanosecond timestamps); `bytes` fields (trace/span ids) as base64.
 * Throws if the bytes aren't valid OTLP — callers should map this to a tool
 * error rather than return garbage.
 */
export function decodeOtlpLogs(bytes: Uint8Array): unknown {
  const type = exportRequestType();
  const message = type.decode(bytes);
  return type.toObject(message, {
    longs: String,
    bytes: String, // base64
    enums: String,
    defaults: false,
    arrays: true,
    objects: true,
  });
}
