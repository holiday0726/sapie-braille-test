Response
When response_mode is blocking, return a CompletionResponse object. When response_mode is streaming, return a ChunkCompletionResponse stream.

ChatCompletionResponse
Returns the complete App result, Content-Type is application/json.

event (string) Event type, fixed to message
task_id (string) Task ID, used for request tracking and the below Stop Generate API
id (string) unique ID
message_id (string) Unique message ID
conversation_id (string) Conversation ID
mode (string) App mode, fixed as chat
answer (string) Complete response content
metadata (object) Metadata
usage (Usage) Model usage information
retriever_resources (array[RetrieverResource]) Citation and Attribution List
created_at (int) Message creation timestamp, e.g., 1705395332
ChunkChatCompletionResponse
Returns the stream chunks outputted by the App, Content-Type is text/event-stream. Each streaming chunk starts with data:, separated by two newline characters \n\n, as shown below:

data: {"event": "message", "task_id": "900bbd43-dc0b-4383-a372-aa6e6c414227", "id": "663c5084-a254-4040-8ad3-51f2a3c1a77c", "answer": "Hi", "created_at": 1705398420}\n\n

Copy
Copied!
The structure of the streaming chunks varies depending on the event:

event: message LLM returns text chunk event, i.e., the complete text is output in a chunked fashion.
task_id (string) Task ID, used for request tracking and the below Stop Generate API
message_id (string) Unique message ID
conversation_id (string) Conversation ID
answer (string) LLM returned text chunk content
created_at (int) Creation timestamp, e.g., 1705395332
event: message_file Message file event, a new file has created by tool
id (string) File unique ID
type (string) File type，only allow "image" currently
belongs_to (string) Belongs to, it will only be an 'assistant' here
url (string) Remote url of file
conversation_id (string) Conversation ID
event: message_end Message end event, receiving this event means streaming has ended.
task_id (string) Task ID, used for request tracking and the below Stop Generate API
message_id (string) Unique message ID
conversation_id (string) Conversation ID
metadata (object) Metadata
usage (Usage) Model usage information
retriever_resources (array[RetrieverResource]) Citation and Attribution List
event: tts_message TTS audio stream event, that is, speech synthesis output. The content is an audio block in Mp3 format, encoded as a base64 string. When playing, simply decode the base64 and feed it into the player. (This message is available only when auto-play is enabled)
task_id (string) Task ID, used for request tracking and the stop response interface below
message_id (string) Unique message ID
audio (string) The audio after speech synthesis, encoded in base64 text content, when playing, simply decode the base64 and feed it into the player
created_at (int) Creation timestamp, e.g.: 1705395332
event: tts_message_end TTS audio stream end event, receiving this event indicates the end of the audio stream.
task_id (string) Task ID, used for request tracking and the stop response interface below
message_id (string) Unique message ID
audio (string) The end event has no audio, so this is an empty string
created_at (int) Creation timestamp, e.g.: 1705395332
event: message_replace Message content replacement event. When output content moderation is enabled, if the content is flagged, then the message content will be replaced with a preset reply through this event.
task_id (string) Task ID, used for request tracking and the below Stop Generate API
message_id (string) Unique message ID
conversation_id (string) Conversation ID
answer (string) Replacement content (directly replaces all LLM reply text)
created_at (int) Creation timestamp, e.g., 1705395332
event: workflow_started workflow starts execution
task_id (string) Task ID, used for request tracking and the below Stop Generate API
workflow_run_id (string) Unique ID of workflow execution
event (string) fixed to workflow_started
data (object) detail
id (string) Unique ID of workflow execution
workflow_id (string) ID of related workflow
created_at (timestamp) Creation timestamp, e.g., 1705395332
event: node_started node execution started
task_id (string) Task ID, used for request tracking and the below Stop Generate API
workflow_run_id (string) Unique ID of workflow execution
event (string) fixed to node_started
data (object) detail
id (string) Unique ID of workflow execution
node_id (string) ID of node
node_type (string) type of node
title (string) name of node
index (int) Execution sequence number, used to display Tracing Node sequence
predecessor_node_id (string) optional Prefix node ID, used for canvas display execution path
inputs (object) Contents of all preceding node variables used in the node
created_at (timestamp) timestamp of start, e.g., 1705395332
event: node_finished node execution ends, success or failure in different states in the same event
task_id (string) Task ID, used for request tracking and the below Stop Generate API
workflow_run_id (string) Unique ID of workflow execution
event (string) fixed to node_finished
data (object) detail
id (string) Unique ID of workflow execution
node_id (string) ID of node
node_type (string) type of node
title (string) name of node
index (int) Execution sequence number, used to display Tracing Node sequence
predecessor_node_id (string) optional Prefix node ID, used for canvas display execution path
inputs (object) Contents of all preceding node variables used in the node
process_data (json) Optional node process data
outputs (json) Optional content of output
status (string) status of execution, running / succeeded / failed / stopped
error (string) Optional reason of error
elapsed_time (float) Optional total seconds to be used
execution_metadata (json) meta data
total_tokens (int) optional tokens to be used
total_price (decimal) optional Total cost
currency (string) optional e.g. USD / RMB
created_at (timestamp) timestamp of start, e.g., 1705395332
event: workflow_finished workflow execution ends, success or failure in different states in the same event
task_id (string) Task ID, used for request tracking and the below Stop Generate API
workflow_run_id (string) Unique ID of workflow execution
event (string) fixed to workflow_finished
data (object) detail
id (string) ID of workflow execution
workflow_id (string) ID of related workflow
status (string) status of execution, running / succeeded / failed / stopped
outputs (json) Optional content of output
error (string) Optional reason of error
elapsed_time (float) Optional total seconds to be used
total_tokens (int) Optional tokens to be used
total_steps (int) default 0
created_at (timestamp) start time
finished_at (timestamp) end time
event: error Exceptions that occur during the streaming process will be output in the form of stream events, and reception of an error event will end the stream.
task_id (string) Task ID, used for request tracking and the below Stop Generate API
message_id (string) Unique message ID
status (int) HTTP status code
code (string) Error code
message (string) Error message
event: ping Ping event every 10 seconds to keep the connection alive.
Errors
404, Conversation does not exists
400, invalid_param, abnormal parameter input
400, app_unavailable, App configuration unavailable
400, provider_not_initialize, no available model credential configuration
400, provider_quota_exceeded, model invocation quota insufficient
400, model_currently_not_support, current model unavailable
400, workflow_not_found, specified workflow version not found
400, draft_workflow_error, cannot use draft workflow version
400, workflow_id_format_error, invalid workflow_id format, expected UUID format
400, completion_request_error, text generation failed
500, internal server error


# request
'''
curl -X POST 'http://agent.sapie.ai/v1/chat-messages' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://cloud.dify.ai/logo/logo-site.png"
      }
    ]
}'
'''

# blocking mode
'''
{
    "event": "message",
    "task_id": "c3800678-a077-43df-a102-53f23ed20b88", 
    "id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "message_id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
    "mode": "chat",
    "answer": "iPhone 13 Pro Max specs are listed here:...",
    "metadata": {
        "usage": {
            "prompt_tokens": 1033,
            "prompt_unit_price": "0.001",
            "prompt_price_unit": "0.001",
            "prompt_price": "0.0010330",
            "completion_tokens": 128,
            "completion_unit_price": "0.002",
            "completion_price_unit": "0.001",
            "completion_price": "0.0002560",
            "total_tokens": 1161,
            "total_price": "0.0012890",
            "currency": "USD",
            "latency": 0.7682376249867957
        },
        "retriever_resources": [
            {
                "position": 1,
                "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb",
                "dataset_name": "iPhone",
                "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00",
                "document_name": "iPhone List",
                "segment_id": "ed599c7f-2766-4294-9d1d-e5235a61270a",
                "score": 0.98457545,
                "content": "\"Model\",\"Release Date\",\"Display Size\",\"Resolution\",\"Processor\",\"RAM\",\"Storage\",\"Camera\",\"Battery\",\"Operating System\"\n\"iPhone 13 Pro Max\",\"September 24, 2021\",\"6.7 inch\",\"1284 x 2778\",\"Hexa-core (2x3.23 GHz Avalanche + 4x1.82 GHz Blizzard)\",\"6 GB\",\"128, 256, 512 GB, 1TB\",\"12 MP\",\"4352 mAh\",\"iOS 15\""
            }
        ]
    },
    "created_at": 1705407629
}
'''

# streaming mode
'''
 data: {"event": "workflow_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "created_at": 1679586595}}
  data: {"event": "node_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "created_at": 1679586595}}
  data: {"event": "node_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "execution_metadata": {"total_tokens": 63127864, "total_price": 2.378, "currency": "USD"},  "created_at": 1679586595}}
  data: {"event": "workflow_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "total_tokens": 63127864, "total_steps": "1", "created_at": 1679586595, "finished_at": 1679976595}}
  data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " I", "created_at": 1679586595}
  data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": "'m", "created_at": 1679586595}
  data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " glad", "created_at": 1679586595}
  data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " to", "created_at": 1679586595}
  data: {"event": "message", "message_id" : "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " meet", "created_at": 1679586595}
  data: {"event": "message", "message_id" : "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " you", "created_at": 1679586595}
  data: {"event": "message_end", "id": "5e52ce04-874b-4d27-9045-b3bc80def685", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "metadata": {"usage": {"prompt_tokens": 1033, "prompt_unit_price": "0.001", "prompt_price_unit": "0.001", "prompt_price": "0.0010330", "completion_tokens": 135, "completion_unit_price": "0.002", "completion_price_unit": "0.001", "completion_price": "0.0002700", "total_tokens": 1168, "total_price": "0.0013030", "currency": "USD", "latency": 1.381760165997548}, "retriever_resources": [{"position": 1, "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb", "dataset_name": "iPhone", "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00", "document_name": "iPhone List", "segment_id": "ed599c7f-2766-4294-9d1d-e5235a61270a", "score": 0.98457545, "content": "\"Model\",\"Release Date\",\"Display Size\",\"Resolution\",\"Processor\",\"RAM\",\"Storage\",\"Camera\",\"Battery\",\"Operating System\"\n\"iPhone 13 Pro Max\",\"September 24, 2021\",\"6.7 inch\",\"1284 x 2778\",\"Hexa-core (2x3.23 GHz Avalanche + 4x1.82 GHz Blizzard)\",\"6 GB\",\"128, 256, 512 GB, 1TB\",\"12 MP\",\"4352 mAh\",\"iOS 15\""}]}}
  data: {"event": "tts_message", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"}
  data: {"event": "tts_message_end", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": ""}
'''