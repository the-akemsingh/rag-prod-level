const DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
] as const;

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

const BLOCKED_MIME_PREFIXES = ["image/", "video/", "audio/"];

export function getDocumentAcceptAttribute(): string {
  return DOCUMENT_EXTENSIONS.join(",");
}

export function isAllowedDocument(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasAllowedExtension = DOCUMENT_EXTENSIONS.some((ext) =>
    name.endsWith(ext),
  );

  if (BLOCKED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return false;
  }

  if (file.type && DOCUMENT_MIME_TYPES.has(file.type)) {
    return true;
  }

  return hasAllowedExtension;
}

export function getDocumentRejectionMessage(): string {
  return "Only document files are allowed (PDF, Word, Excel, PowerPoint, text, CSV, etc.). Images and videos are not supported.";
}
