export async function downloadPdf(
  request: () => Promise<{ data: Blob }>,
  filename = "report.pdf",
) {
  const response = await request();
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
