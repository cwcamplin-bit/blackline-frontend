// Blocking script rendered at the very top of <head>, before any CSS is
// applied. Reads the stored theme and stamps data-theme on <html> before
// first paint, so there's never a flash of the wrong theme on navigation —
// matches the behaviour every app-shell page had individually before the
// migration, now shared once in the root layout.
const THEME_INIT_SCRIPT = `
(function(){
  try{
    var t = localStorage.getItem('blackline_theme');
    if(t === 'light' || t === 'dark'){
      document.documentElement.setAttribute('data-theme', t);
    }
  }catch(e){}
})();
`;

export default function ThemeInit() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
