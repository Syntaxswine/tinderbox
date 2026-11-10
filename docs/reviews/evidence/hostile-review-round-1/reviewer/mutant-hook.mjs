// In-memory mutation: the checkout is never edited. TB_MUTANT = {"file": "<url suffix>", "find": "...", "replace": "..."}.
import {registerHooks} from 'node:module';
const spec = process.env.TB_MUTANT ? JSON.parse(process.env.TB_MUTANT) : null;
if (spec) {
  registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (!url.endsWith(spec.file)) return result;
      const source = result.source.toString();
      const count = source.split(spec.find).length - 1;
      if (count !== 1) throw Error(`Mutation site must occur exactly once in ${spec.file}; found ${count}: ${spec.find}`);
      return {...result, source: source.replace(spec.find, spec.replace)};
    }
  });
}
