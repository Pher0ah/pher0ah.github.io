window.onload = function() {
  loadCookies();
}

function saveDetails() {
  var tenantID = document.getElementById('tenantID').value;
  var username = document.getElementById('username').value;

  document.cookie = "tenant_" + tenantID + "=" + username;
  loadCookies();
}

function loadCookies() {
  var cookies = document.cookie.split('; ');
  var tenantDropdown = document.getElementById('tenantDropdown');
  tenantDropdown.innerHTML = '';

  for (var i = 0; i < cookies.length; i++) {
      var cookiePair = cookies[i].split('=');
      if (cookiePair[0].startsWith('tenant_')) {
          var tenantID = cookiePair[0].substring(7);
          var option = document.createElement('option');
          option.value = tenantID;
          option.textContent = tenantID;
          tenantDropdown.appendChild(option);
      }
  }
}

function displayUsername(tenantID) {
  var username = getCookie("tenant_" + tenantID);
  document.getElementById('usernameDisplay').textContent = username;
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
  }
  return "";
}
