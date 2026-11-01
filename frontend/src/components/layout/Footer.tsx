export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low py-space-xl shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-lg mb-space-lg">
          <div className="space-y-space-xs">
            <div className="font-headline-sm text-headline-sm text-primary">OCMS Academic Repository</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              The unified instructional registrar and digital course syllabus catalog for accredited university programs and departments.
            </p>
          </div>
          <div>
            <div className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">Academic Governance</div>
            <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li><a className="hover:text-on-surface transition-colors" href="#">Office of the Registrar</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Curriculum Committee Charter</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Faculty Senate Resolutions</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Institutional Archives</a></li>
            </ul>
          </div>
          <div>
            <div className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">Syllabus Standards</div>
            <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li><a className="hover:text-on-surface transition-colors" href="#">Course Catalog Archives (1998–2024)</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Grading Basis &amp; Credit Hour Policies</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Course Prerequisites Directory</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Transfer Articulation Tables</a></li>
            </ul>
          </div>
          <div>
            <div className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-sm">Compliance &amp; Access</div>
            <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li><a className="hover:text-on-surface transition-colors" href="#">WCAG 2.1 AA Accessibility Report</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Higher Learning Commission Accreditation</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">FERPA Student Rights Notice</a></li>
              <li><a className="hover:text-on-surface transition-colors" href="#">Information Security Office</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-space-md flex flex-col md:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
          <p>© 2025 Office of Academic Affairs • University Online Course Management System. All official rights reserved.</p>
          <div className="flex items-center gap-space-md">
            <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface">System Status: Operational</span>
            <span className="text-on-surface-variant">Archival Build v4.12.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
