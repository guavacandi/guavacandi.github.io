export default function ResumeWindow() {
    const pdfUrl = "/Chloe_Ng2026Resume.pdf";
  
    return (
      <div style={{ height: "100%", width: "100%", padding: 10, boxSizing: "border-box" }}>
        <div style={{ height: "calc(100% - 44px)", border: "1px solid #000" }}>
          <iframe
            title="Resume PDF"
            src={pdfUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
  
        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              border: "1px solid #000",
              padding: "6px 10px",
              background: "#d8d8d8",
              color: "#000",
              textDecoration: "none",
              fontFamily: "ChicagoFLF, sans-serif",
            }}
          >
            Open PDF
          </a>
  
          <a
            href={pdfUrl}
            download
            style={{
              border: "1px solid #000",
              padding: "6px 10px",
              background: "#d8d8d8",
              color: "#000",
              textDecoration: "none",
              fontFamily: "ChicagoFLF, sans-serif",
            }}
          >
            Download
          </a>
        </div>
      </div>
    );
  }
  