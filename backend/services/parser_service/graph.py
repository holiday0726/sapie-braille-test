"""
문서 파싱 서비스를 위한 LangGraph 그래프 정의
"""
import os
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from state import ParserState, FileType
from nodes import (
    InputNode,
    SplitPDFFilesNode,
    DocumentParseNode,
    PostDocumentParseNode,
    WorkingQueueNode,
    continue_parse,
    MultimodalLLMNode,
    BatchMultimodalNode, # 이름 변경
    ExportImage,
    ExportHTML,
    ExportMarkdown,
    CleanupNode,
)
from nodes.process_node import route_processor

# --- Sub-graphs ---

def create_upstage_pdf_graph(
    batch_size: int = 30,
    test_page: int = None,
    verbose: bool = True,
    visualize: bool = False,
):
    """
    Upstage Document AI를 사용하여 PDF를 처리하고 마크다운을 생성하는 서브그래프.
    """
    # Nodes
    split_pdf = SplitPDFFilesNode(batch_size=batch_size, test_page=test_page, verbose=verbose)
    doc_parse = DocumentParseNode(api_key=os.environ["UPSTAGE_API_KEY"], verbose=verbose)
    post_doc_parse = PostDocumentParseNode(verbose=verbose)
    working_queue = WorkingQueueNode(verbose=verbose)
    export_image = ExportImage(verbose=verbose)
    batch_multimodal = BatchMultimodalNode(verbose=verbose) # 이름 변경

    export_html = ExportHTML(verbose=verbose,show_image=False)

    # Graph
    workflow = StateGraph(ParserState)
    workflow.add_node("split_pdf", split_pdf)
    workflow.add_node("document_parse", doc_parse)
    workflow.add_node("post_document_parse", post_doc_parse)
    workflow.add_node("working_queue", working_queue)
    workflow.add_node("export_image", export_image)
    workflow.add_node("batch_multimodal", batch_multimodal) # 이름 변경
    workflow.add_node("export_html", export_html)

    # Edges
    workflow.set_entry_point("split_pdf")
    workflow.add_edge("split_pdf", "working_queue")
    workflow.add_conditional_edges(
        "working_queue", continue_parse, {"True": "document_parse", "False": "post_document_parse"}
    )
    workflow.add_edge("document_parse", "working_queue")
    workflow.add_edge("post_document_parse", "export_image")
    workflow.add_edge("export_image", "batch_multimodal")
    workflow.add_edge("batch_multimodal", "export_html")
    workflow.add_edge("export_html", END)

    graph = workflow.compile(checkpointer=MemorySaver())
    if visualize:
        visualize_graph(graph, "upstage_pdf_subgraph.png")
    return graph

def create_image_graph(verbose: bool = True, **kwargs):
    """
    이미지를 처리하고 structured_result 생성하는 서브그래프.
    """
    image_node = MultimodalLLMNode(verbose=verbose)
    workflow = StateGraph(ParserState)
    workflow.add_node("image_node", image_node)
    workflow.set_entry_point("image_node")
    workflow.add_edge("image_node", END)
    return workflow.compile(checkpointer=MemorySaver())

# --- Main Graph ---


# 현재 스크립트 파일의 디렉토리 경로를 기준으로 절대 경로를 생성합니다.
# 이렇게 하면 스크립트가 어디에서 실행되든 일관된 경로를 유지할 수 있습니다.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def create_main_graph(
    download_dir: str = "temp_files",
    batch_size: int = 30,
    test_page: int = None,
    verbose: bool = True,
    visualize: bool = False,
):
    """
    입력 노드로 시작하여 파일 타입에 따라 적절한 서브그래프로 분기하는 메인 그래프.
    """
    # Nodes and Sub-graphs
    full_download_dir = os.path.join(SCRIPT_DIR, download_dir)
    input_node = InputNode(download_dir=full_download_dir, verbose=verbose)
    image_subgraph = create_image_graph(verbose=verbose)
    pdf_subgraph = create_upstage_pdf_graph(
        batch_size=batch_size, test_page=test_page, verbose=verbose, visualize=visualize
    )
    cleanup_node = CleanupNode(verbose=verbose)

    # Main Graph
    workflow = StateGraph(ParserState)
    workflow.add_node("input_node", input_node)
    workflow.add_node("image_process", image_subgraph)
    workflow.add_node("pdf_process", pdf_subgraph)
    workflow.add_node("cleanup", cleanup_node)

    # Edges
    workflow.set_entry_point("input_node")
    workflow.add_conditional_edges(
        "input_node",
        route_processor,
        {"image": "image_process", "pdf": "pdf_process", "unknown": END},
    )
    workflow.add_edge("image_process", "cleanup")
    workflow.add_edge("pdf_process", "cleanup")
    workflow.add_edge("cleanup", END)
    # workflow.add_edge("image_process", END)
    # workflow.add_edge("pdf_process", END)

    main_graph = workflow.compile(checkpointer=MemorySaver())
    if visualize:
        visualize_graph(main_graph, "main_parsing_graph.png")
    return main_graph
