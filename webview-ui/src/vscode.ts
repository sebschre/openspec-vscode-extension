import { WebviewToExtensionMessage } from '../../src/protocol/messages';

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): any;
  setState(state: any): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApi: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeApi) {
    if (typeof acquireVsCodeApi === 'function') {
      vscodeApi = acquireVsCodeApi();
    } else {
      // Mock for browser testing
      vscodeApi = {
        postMessage: (msg) => console.log('[VsCodeApi mock] postMessage:', msg),
        getState: () => ({}),
        setState: (st) => console.log('[VsCodeApi mock] setState:', st),
      };
    }
  }
  return vscodeApi;
}
