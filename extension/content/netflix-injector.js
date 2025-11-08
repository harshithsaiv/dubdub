// Netflix subtitle interceptor - injected into page context to capture XHR responses
// This script runs in the page context (not content script context) to intercept Netflix API calls

(function (xhr) {
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;

  // Override XHR.open to capture the URL
  XHR.open = function (method, url) {
    this._method = method;
    this._url = url;
    return open.apply(this, arguments);
  };

  // Override XHR.send to intercept responses
  XHR.send = function (postData) {
    this.addEventListener("load", function () {
      const myUrl = this._url ? this._url.toLowerCase() : this._url;
      
      // Netflix subtitle URLs contain "/?o=" 
      if (myUrl && myUrl.indexOf("/?o=") !== -1) {
        const responseData = this.response;

        console.log(`[DubDub Netflix] Intercepted subtitle data from: ${myUrl}`);

        // Dispatch custom event with subtitle data to content script
        document.dispatchEvent(
          new CustomEvent("DUBDUB_NETFLIX_SUBTITLE", {
            detail: { data: responseData, url: myUrl },
          })
        );
      }
    });
    
    return send.apply(this, arguments);
  };
})(XMLHttpRequest);

console.log("[DubDub Netflix] XHR interceptor injected successfully");
