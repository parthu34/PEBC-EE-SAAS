"use client";

export default function ExportPdfButton(){
  return (
    <button className="btn" onClick={()=>window.print()}>Export as PDF</button>
  );
}
