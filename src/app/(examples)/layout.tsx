import { SandboxTabs } from "@/components/sandbox-tabs";
import { CornerFrame } from "@/components/corner-frame";
import { ArrowIcon, CadenyaLockup, CadenyaMark } from "@/components/brand";
import { GithubIcon } from "@/components/github-icon";
import { VerificationGate } from "@/components/verification-gate";

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return <VerificationGate>
    <main className="portal-shell">
      <div className="portal-frame">
        <header className="portal-header">
          <a className="brand" href="https://cadenya.com" aria-label="Cadenya home"><CadenyaLockup className="brand-lockup" /><CadenyaMark className="brand-mark" /></a>
          <span className="nav-cell is-active type-nav nav-hide-mobile" aria-current="page">Widget sandbox</span>
          <span className="nav-spacer" />
          <nav className="nav-end" aria-label="Cadenya">
            <a className="nav-cell type-nav" href="https://cadenya.com/docs" target="_blank" rel="noreferrer">Docs</a>
            <a className="nav-cell type-nav" href="https://github.com/cadenya/widgets-ui-react" target="_blank" rel="noreferrer" aria-label="UI library on GitHub"><GithubIcon /><span className="nav-hide-mobile">UI library</span></a>
            <a className="nav-cell type-nav" href="https://app.cadenya.com/login" target="_blank" rel="noreferrer">Login<ArrowIcon /></a>
          </nav>
        </header>

        <CornerFrame as="section" className="portal-intro">
          <div className="portal-intro-headline"><h1 className="type-display">Cadenya Widgets&nbsp;Demo</h1></div>
          <div className="portal-intro-aside">
            <p>Plan a trip, play chess, or build a diagram with an agent. Every demo below runs on the Cadenya widget library.</p>
            <div className="portal-intro-actions">
              <a className="btn btn-primary" href="https://app.cadenya.com/signup" target="_blank" rel="noreferrer"><span>Sign up</span><span className="btn-arrow"><ArrowIcon /></span></a>
            </div>
          </div>
        </CornerFrame>

        <SandboxTabs />
        {children}
      </div>
    </main>
    <div className="pattern-band" aria-hidden="true"><div /></div>
  </VerificationGate>;
}
