import ScentmarkedContentManager from "@/components/ScentmarkedContentManager";
import CatalogInventory from "@/components/CatalogInventory";

export default function Page(){
 return <main className="scentmarked-content-page">
  <header className="scentmarked-content-header">
   <a href="/">← Atlas overview</a>
   <h1>Scentmarked Content Manager</h1>
   <p>Manage fragrance research, review catalog data, and prepare content without changing live perfume records.</p>
   <nav aria-label="Content manager sections">
    <a href="#catalog-inventory">Catalog &amp; Arabiyat reviews</a>
    <a href="#content-workflows">Content workflows</a>
    <a href="/scentmarked-content/research">Research queue ↗</a>
    <a href="/scentmarked-content/graphics">Graphics queue ↗</a>
   </nav>
  </header>
  <section id="catalog-inventory" className="scentmarked-content-panel"><CatalogInventory/></section>
  <section id="content-workflows" className="scentmarked-content-panel"><ScentmarkedContentManager/></section>
  <style>{`
   .scentmarked-content-page{display:block;grid-template-columns:none;width:100%;max-width:1320px;margin:0 auto;padding:24px clamp(16px,3vw,40px);box-sizing:border-box;min-width:0}
   .scentmarked-content-header{display:block;margin-bottom:24px}
   .scentmarked-content-header h1{font-size:clamp(1.65rem,3vw,2.5rem);margin:14px 0 8px}
   .scentmarked-content-header p{max-width:760px;color:var(--muted,#9ca3af)}
   .scentmarked-content-header nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
   .scentmarked-content-header nav a{display:inline-block;padding:10px 14px;border:1px solid #64748b;border-radius:10px;text-decoration:none}
   .scentmarked-content-panel{display:block;max-width:none;width:100%;min-width:0;box-sizing:border-box;padding:clamp(16px,2.5vw,30px);margin:20px 0;border:1px solid #475569;border-radius:16px}
   .scentmarked-content-panel section{display:block;width:100%;min-width:0;max-width:none;margin:0;padding:0}
   .scentmarked-content-panel details{padding:12px 0;border-bottom:1px solid #475569}
   .scentmarked-content-panel summary{cursor:pointer;font-weight:650;line-height:1.5}
   .scentmarked-content-panel input,.scentmarked-content-panel select,.scentmarked-content-panel textarea{max-width:100%;box-sizing:border-box}
   .scentmarked-content-panel button{min-height:40px;margin:4px 5px 4px 0;white-space:normal}
   .scentmarked-content-panel table{width:100%;border-collapse:collapse;min-width:500px}
   .scentmarked-content-panel th,.scentmarked-content-panel td{text-align:left;padding:9px 12px;border-bottom:1px solid #475569;vertical-align:top}
   .scentmarked-content-panel>section>div{max-width:100%}\n   .scentmarked-content-panel label{display:inline-block;margin:6px 6px 6px 0}\n   .scentmarked-content-panel input,.scentmarked-content-panel select{min-height:36px;margin:4px 8px 4px 0}\n   .scentmarked-content-panel input[type="text"],.scentmarked-content-panel input[type="search"]{width:min(100%,320px)}\n   .scentmarked-content-panel p,.scentmarked-content-panel li{line-height:1.55;overflow-wrap:anywhere}\n   .scentmarked-content-panel table{display:table}\n   .scentmarked-content-panel details>summary{padding:8px 0}
   @media(max-width:760px){.scentmarked-content-page{padding:12px}.scentmarked-content-panel{padding:14px;margin:14px 0}.scentmarked-content-header nav a{flex:1 1 150px;text-align:center}.scentmarked-content-panel table{font-size:.9rem}}
  `}</style>
 </main>;
}
