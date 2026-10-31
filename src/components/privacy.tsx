export function Privacy() {
  return (
    <section className="panel">
      <h2>Your source stays on your device</h2>
      <p>
        CodeTA parses C++ in your browser with bundled Tree-sitter WebAssembly. Source code, written
        answers, and assessment records are not uploaded to an AI service, database, or application
        backend. No API key or account is required.
      </p>
      <p>
        Loading the static website and its bundled assets sends ordinary web request metadata to the
        hosting provider. Required scripts, styles, fonts, and parser assets are served from this
        site; no external runtime service or analytics is configured.
      </p>
      <h2>Browser-local storage</h2>
      <p>
        Source drafts, progress, and up to 15 recent sessions are stored in this browser profile.
        They may be lost if storage is cleared or unavailable. Anyone with access to that profile
        may be able to read them. Use Export History to back up your records; exports include source
        and answers.
      </p>
      <p>
        Delete one session or Clear All History from History. Earlier paid-version history uses a
        separate storage key and is never silently converted into CodeTA scores. History includes
        separate controls to export or delete those legacy records.
      </p>
      <h2>Offline use and limitations</h2>
      <p>
        After the first successful online load, the application attempts to cache its own static
        assets for offline practice. Offline availability depends on your browser and its storage
        policy; local history and downloaded exports remain your responsibility.
      </p>
      <p>
        This is a syntax and practice tool, not a C++ compiler or execution environment. Headers,
        overload resolution, macros, and every semantic language rule are not verified. Written
        answers are self-assessed; only multiple-choice answers use automatic answer keys. Scores
        are informal study records. Independent student project. Not officially affiliated with
        National Tsing Hua University.
      </p>
    </section>
  );
}
