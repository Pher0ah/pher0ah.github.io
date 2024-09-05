function requestJson(method, url, params, successCallback, failureCallback) {
  method = method.toUpperCase();
  var body = null;
  if (method === 'GET') {
      url = injectQueryStringParams(url, params);
  }
  else {
      body = encodeParams(params);
  }
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  if (method !== 'GET') {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  }
  xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
          var parsed = false;
          var res = void 0;
          try {
              res = JSON.parse(xhr.responseText);
              parsed = true;
          }
          catch (err) {
              // will handle parsed=false
          }
          if (parsed) {
              successCallback(res, xhr);
          }
          else {
              failureCallback('Failure parsing JSON', xhr);
          }
      }
      else {
          failureCallback('Request failed', xhr);
      }
  };
  xhr.onerror = function () {
      failureCallback('Request failed', xhr);
  };
  xhr.send(body);
}
function injectQueryStringParams(url, params) {
  return url +
      (url.indexOf('?') === -1 ? '?' : '&') +
      encodeParams(params);
}
function encodeParams(params) {
  var parts = [];
  for (var key in params) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
  }
  return parts.join('&');
}