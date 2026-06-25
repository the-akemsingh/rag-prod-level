from langchain_core.documents import Document


def load_xls(filepath: str) -> list[Document]:
    import xlrd
    wb = xlrd.open_workbook(filepath)
    documents = []
    for sheet_index in range(wb.nsheets):
        sheet = wb.sheet_by_index(sheet_index)
        sheet_data = []
        for row_idx in range(sheet.nrows):
            row = sheet.row_values(row_idx)
            if any(cell != "" for cell in row):
                row_str = ", ".join([str(cell) if cell != "" else "" for cell in row])
                sheet_data.append(row_str)
        content = "\n".join(sheet_data)
        if content.strip():
            documents.append(Document(page_content=content, metadata={"source": filepath, "sheet": sheet.name}))
    return documents