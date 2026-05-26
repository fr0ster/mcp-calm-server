/**
 * Minimal self-contained subset of the OpenTelemetry protocol (OTLP) needed to
 * decode the Cloud ALM Logs `application/x-protobuf` response. Field numbers
 * match the upstream opentelemetry-proto definitions (common/v1, resource/v1,
 * logs/v1, collector/logs/v1) verbatim — do not renumber.
 *
 * Embedded as a string (parsed at runtime via protobufjs) rather than shipped
 * as a `.proto` asset, so it survives `tsc` compilation into `dist/` with no
 * build-time file copying.
 */
export const OTLP_LOGS_PROTO = `
syntax = "proto3";
package opentelemetry.proto.logs.v1;

message AnyValue {
  oneof value {
    string string_value = 1;
    bool bool_value = 2;
    int64 int_value = 3;
    double double_value = 4;
    ArrayValue array_value = 5;
    KeyValueList kvlist_value = 6;
    bytes bytes_value = 7;
  }
}
message ArrayValue { repeated AnyValue values = 1; }
message KeyValueList { repeated KeyValue values = 1; }
message KeyValue { string key = 1; AnyValue value = 2; }
message InstrumentationScope {
  string name = 1;
  string version = 2;
  repeated KeyValue attributes = 3;
  uint32 dropped_attributes_count = 4;
}
message Resource {
  repeated KeyValue attributes = 1;
  uint32 dropped_attributes_count = 2;
}
message LogsData { repeated ResourceLogs resource_logs = 1; }
message ResourceLogs {
  Resource resource = 1;
  repeated ScopeLogs scope_logs = 2;
  string schema_url = 3;
}
message ScopeLogs {
  InstrumentationScope scope = 1;
  repeated LogRecord log_records = 2;
  string schema_url = 3;
}
message LogRecord {
  fixed64 time_unix_nano = 1;
  int32 severity_number = 2;
  string severity_text = 3;
  AnyValue body = 5;
  repeated KeyValue attributes = 6;
  uint32 dropped_attributes_count = 7;
  uint32 flags = 8;
  bytes trace_id = 9;
  bytes span_id = 10;
  fixed64 observed_time_unix_nano = 11;
}
message ExportLogsServiceRequest { repeated ResourceLogs resource_logs = 1; }
`;
