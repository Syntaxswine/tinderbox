// In-memory source patches: the checkout is never edited.
// TB_PATCHES = JSON array of {file: "<url suffix>", find: "...", replace: "..."}.
// Each find must occur exactly once in its file. A patch whose file is never loaded is reported by the caller, not here.
import {registerHooks} from 'node:module';
const patches = process.env.TB_PATCHES ? JSON.parse(process.env.TB_PATCHES) : [];
if (patches.length) {
  registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      const mine = patches.filter(spec => url.endsWith(spec.file));
      if (!mine.length) return result;
      let source = result.source.toString();
      for (const spec of mine) {
        const count = source.split(spec.find).length - 1;
        if (count !== 1) throw Error(`Patch site must occur exactly once in ${spec.file}; found ${count}: ${spec.find}`);
        source = source.replace(spec.find, () => spec.replace);
      }
      return {...result, source};
    }
  });
}
