Send Chat Message
Send a request to the chat application.

Request Body
Name
query
Type
string
Description
User Input/Question content

Name
inputs
Type
object
Description
Allows the entry of various variable values defined by the App. The inputs parameter contains multiple key/value pairs, with each key corresponding to a specific variable and each value being the specific value for that variable. If the variable is of file type, specify an object that has the keys described in files below. Default {}

Name
response_mode
Type
string
Description
The mode of response return, supporting:

streaming Streaming mode (recommended), implements a typewriter-like output through SSE (Server-Sent Events).
blocking Blocking mode, returns result after execution is complete. (Requests may be interrupted if the process is long) Due to Cloudflare restrictions, the request will be interrupted without a return after 100 seconds.
Name
user
Type
string
Description
User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application. The Service API does not share conversations created by the WebApp.

Name
conversation_id
Type
string
Description
Conversation ID, to continue the conversation based on previous chat records, it is necessary to pass the previous message's conversation_id.

Name
files
Type
array[object]
Description
File list, suitable for inputting files combined with text understanding and answering questions, available only when the model supports Vision capability.

type (string) Supported type:
document ('TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB')
image ('JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG')
audio ('MP3', 'M4A', 'WAV', 'WEBM', 'AMR')
video ('MP4', 'MOV', 'MPEG', 'MPGA')
custom (Other file types)
transfer_method (string) Transfer method, remote_url for image URL / local_file for file upload
url (string) Image URL (when the transfer method is remote_url)
upload_file_id (string) Uploaded file ID, which must be obtained by uploading through the File Upload API in advance (when the transfer method is local_file)
Name
auto_generate_name
Type
bool
Description
Auto-generate title, default is true. If set to false, can achieve async title generation by calling the conversation rename API and setting auto_generate to true.

Name
workflow_id
Type
string
Description
(Optional) Workflow ID to specify a specific version, if not provided, uses the default published version.

Name
trace_id
Type
string
Description
(Optional) Trace ID. Used for integration with existing business trace components to achieve end-to-end distributed tracing. If not provided, the system will automatically generate a trace_id. Supports the following three ways to pass, in order of priority:

Header: via HTTP Header X-Trace-Id, highest priority.
Query parameter: via URL query parameter trace_id.
Request Body: via request body field trace_id (i.e., this field).
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

Request
POST
/chat-messages
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

Response
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


------------------------------
File Upload
Upload a file for use when sending messages, enabling multimodal understanding of images and text. Supports any formats that are supported by your application. Uploaded files are for use by the current end-user only.

Request Body
This interface requires a multipart/form-data request.

file (File) Required The file to be uploaded.
user (string) Required User identifier, defined by the developer's rules, must be unique within the application. The Service API does not share conversations created by the WebApp.
Response
After a successful upload, the server will return the file's ID and related information.

id (uuid) ID
name (string) File name
size (int) File size (bytes)
extension (string) File extension
mime_type (string) File mime-type
created_by (uuid) End-user ID
created_at (timestamp) Creation timestamp, e.g., 1705395332
Errors
400, no_file_uploaded, a file must be provided
400, too_many_files, currently only one file is accepted
400, unsupported_preview, the file does not support preview
400, unsupported_estimate, the file does not support estimation
413, file_too_large, the file is too large
415, unsupported_file_type, unsupported extension, currently only document files are accepted
503, s3_connection_failed, unable to connect to S3 service
503, s3_permission_denied, no permission to upload files to S3
503, s3_file_too_large, file exceeds S3 size limit
500, internal server error

Request
POST
/files/upload
curl -X POST 'http://agent.sapie.ai/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif]' \
--form 'user=abc-123'

Response
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": "6ad1ab0a-73ff-4ac1-b9e4-cdb312f71f13",
  "created_at": 1577836800,
}


------------------------------
File Preview
Preview or download uploaded files. This endpoint allows you to access files that have been previously uploaded via the File Upload API.

Files can only be accessed if they belong to messages within the requesting application.
Path Parameters
file_id (string) Required The unique identifier of the file to preview, obtained from the File Upload API response.
Query Parameters
as_attachment (boolean) Optional Whether to force download the file as an attachment. Default is false (preview in browser).
Response
Returns the file content with appropriate headers for browser display or download.

Content-Type Set based on file mime type
Content-Length File size in bytes (if available)
Content-Disposition Set to "attachment" if as_attachment=true
Cache-Control Caching headers for performance
Accept-Ranges Set to "bytes" for audio/video files
Errors
400, invalid_param, abnormal parameter input
403, file_access_denied, file access denied or file does not belong to current application
404, file_not_found, file not found or has been deleted
500, internal server error

Request
GET
/files/:file_id/preview
curl -X GET 'http://agent.sapie.ai/v1/files/72fa9618-8f89-4a37-9b33-7e1178a24a67/preview' \
--header 'Authorization: Bearer {api_key}'

Download Request
GET
/files/:file_id/preview?as_attachment=true
curl -X GET 'http://agent.sapie.ai/v1/files/72fa9618-8f89-4a37-9b33-7e1178a24a67/preview?as_attachment=true' \
--header 'Authorization: Bearer {api_key}' \
--output downloaded_file.png

Response Headers
Content-Type: image/png
Content-Length: 1024
Cache-Control: public, max-age=3600

Download Response Headers
Content-Type: image/png
Content-Length: 1024
Content-Disposition: attachment; filename*=UTF-8''example.png
Cache-Control: public, max-age=3600

------------------------------
Get Conversation History Messages
Returns historical chat records in a scrolling load format, with the first page returning the latest {limit} messages, i.e., in reverse order.

Query
Name
conversation_id
Type
string
Description
Conversation ID

Name
user
Type
string
Description
User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application.

Name
first_id
Type
string
Description
The ID of the first chat record on the current page, default is null.

Name
limit
Type
int
Description
How many chat history messages to return in one request, default is 20.

Response
data (array[object]) Message list
id (string) Message ID
conversation_id (string) Conversation ID
inputs (object) User input parameters.
query (string) User input / question content.
message_files (array[object]) Message files
id (string) ID
type (string) File type, image for images
url (string) File preview URL, use the File Preview API (/files/{file_id}/preview) to access the file
belongs_to (string) belongs to，user orassistant
answer (string) Response message content
created_at (timestamp) Creation timestamp, e.g., 1705395332
feedback (object) Feedback information
rating (string) Upvote as like / Downvote as dislike
retriever_resources (array[RetrieverResource]) Citation and Attribution List
has_more (bool) Whether there is a next page
limit (int) Number of returned items, if input exceeds system limit, returns system limit amount

Request
GET
/messages
curl -X GET 'http://agent.sapie.ai/v1/messages?user=abc-123&conversation_id='\
 --header 'Authorization: Bearer {api_key}'


 Response
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
        "id": "a076a87f-31e5-48dc-b452-0061adbbc922",
        "conversation_id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
        "inputs": {
            "name": "dify"
        },
        "query": "iphone 13 pro",
        "answer": "The iPhone 13 Pro, released on September 24, 2021, features a 6.1-inch display with a resolution of 1170 x 2532. It is equipped with a Hexa-core (2x3.23 GHz Avalanche + 4x1.82 GHz Blizzard) processor, 6 GB of RAM, and offers storage options of 128 GB, 256 GB, 512 GB, and 1 TB. The camera is 12 MP, the battery capacity is 3095 mAh, and it runs on iOS 15.",
        "message_files": [],
        "feedback": null,
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
        ],
        "created_at": 1705569239,
    }
  ]
}
------------------------------
Get Conversations
Retrieve the conversation list for the current user, defaulting to the most recent 20 entries.

Query
Name
user
Type
string
Description
User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application.

Name
last_id
Type
string
Description
(Optional) The ID of the last record on the current page, default is null.

Name
limit
Type
int
Description
(Optional) How many records to return in one request, default is the most recent 20 entries. Maximum 100, minimum 1.

Name
sort_by
Type
string
Description
(Optional) Sorting Field, Default: -updated_at (sorted in descending order by update time)

Available Values: created_at, -created_at, updated_at, -updated_at
The symbol before the field represents the order or reverse, "-" represents reverse order.
Response
data (array[object]) List of conversations
id (string) Conversation ID
name (string) Conversation name, by default, is generated by LLM.
inputs (object) User input parameters.
status (string) Conversation status
introduction (string) Introduction
created_at (timestamp) Creation timestamp, e.g., 1705395332
updated_at (timestamp) Update timestamp, e.g., 1705395332
has_more (bool)
limit (int) Number of entries returned, if input exceeds system limit, system limit number is returned

Request
GET
/conversations
curl -X GET 'http://agent.sapie.ai/v1/conversations?user=abc-123&last_id=&limit=20' \
 --header 'Authorization: Bearer {api_key}'

 Response
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
      "id": "10799fb8-64f7-4296-bbf7-b42bfbe0ae54",
      "name": "New chat",
      "inputs": {
          "book": "book",
          "myName": "Lucy"
      },
      "status": "normal",
      "created_at": 1679667915,
      "updated_at": 1679667915
    },
    {
      "id": "hSIhXBhNe8X1d8Et"
      // ...
    }
  ]
}