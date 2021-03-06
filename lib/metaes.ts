import { parse } from "./parse";
import { EvaluationConfig, OnSuccess, Evaluate, Source, OnError, MetaesException } from "./types";
import { evaluate } from "./applyEval";
import { ASTNode } from "./nodes/nodes";
import { FunctionNode, ExpressionStatement } from "./nodeTypes";
import { Environment, EnvironmentBase } from "./environment";

const log = e => console.log(e);

export interface ScriptingContext {
  evaluate: Evaluate;
}

let scriptsConter = 0;

export const metaesEval: Evaluate = (source, c?, cerr?, environment = {}, config = {}) => {
  try {
    const node: ASTNode =
      typeof source === "object" ? source : typeof source === "function" ? parseFunction(source) : parse(source);
    let env: Environment;

    if ("values" in environment) {
      env = environment as Environment;
    } else {
      env = {
        values: environment
      };
    }

    if (!config.scriptId) {
      config.scriptId = "" + scriptsConter++;
    }
    evaluate(
      node,
      env,
      config,
      val => c && c(val, node),
      exception => {
        if (cerr) {
          if (!exception.location) {
            exception.location = node;
          }
          cerr(exception);
        }
      }
    );
  } catch (e) {
    if (cerr) {
      cerr(e);
    } else {
      throw e;
    }
  }
};

export class MetaesContext implements ScriptingContext {
  constructor(
    public c?: OnSuccess,
    public cerr?: OnError,
    public environment: Environment = { values: {} },
    public config: EvaluationConfig = { onError: log }
  ) {}

  evaluate(
    source: Source | Function,
    c?: OnSuccess,
    cerr?: OnError,
    environment?: EnvironmentBase,
    config?: EvaluationConfig
  ) {
    let env = this.environment;
    if (environment) {
      env = Object.assign({ prev: this.environment }, environment);
    }
    metaesEval(
      source,
      c || this.c,
      cerr || this.cerr,
      env,
      Object.assign({}, config || this.config, { scriptId: null })
    );
  }
}

export const evalToPromise = (context: ScriptingContext, source: Source | Function, environment?: EnvironmentBase) =>
  new Promise<any>((resolve, reject) => context.evaluate(source, resolve, reject, environment));

export const parseFunction = (fn: Function) => parse("(" + fn.toString() + ")", { loc: false, range: false });

/**
 * Function params are igonred, they are used only to satisfy linters/compilers on client code.
 * @param context
 * @param source
 * @param environment
 */
export const evalFunctionBody = (context: ScriptingContext, source: Function, environment?: EnvironmentBase) =>
  new Promise((resolve, reject) =>
    context.evaluate(
      ((parseFunction(source).body[0] as ExpressionStatement).expression as FunctionNode).body,
      resolve,
      reject,
      environment
    )
  );

export const consoleLoggingMetaesContext = (environment: Environment = { values: {} }) =>
  new MetaesContext(
    value => {
      console.log(value);
    },
    e => console.log(e),
    environment,
    {
      interceptor: evaluation => {
        console.log(evaluation);
      },
      onError: (e: MetaesException) => {
        console.log(e);
      }
    }
  );
