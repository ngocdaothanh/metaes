import { describe, it } from "mocha";
import { metaesEval } from "../../lib/metaes";

describe("Async functions", () => {
  it("should throw on AwaitExpression use", () =>
    new Promise((resolve, reject) => {
      metaesEval(
        `(async ()=>await 2)()`,
        x => {
          console.log("BUKA", x);
        },
        resolve
      );
    }));
});
