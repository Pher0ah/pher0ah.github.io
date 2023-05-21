window.onload = function() {
  loadDetails();
}

function saveDetails() {
  var tenantID = document.getElementById('tenantID').value;
  var username = document.getElementById('username').value;
  localStorage.setItem('tenant_' + tenantID, username);
  loadDetails();
}

function loadDetails() {
  var select = document.getElementById('tenantDropdown');
  select.options.length = 0; // clear out existing options
  for (var i = 0; i < localStorage.length; i++){
      var key = localStorage.key(i);
      if(key.startsWith('tenant_')) {
          var tenantID = key.substring('tenant_'.length);
          var opt = document.createElement('option');
          opt.value = tenantID;
          opt.innerHTML = tenantID;
          select.appendChild(opt);
      }
  }
}

function displayUsername(tenantID) {
  var username = localStorage.getItem('tenant_' + tenantID);
  document.getElementById('usernameDisplay').innerText = username;
}

function deleteDetails() {
  var tenantID = document.getElementById('tenantDropdown').value;
  localStorage.removeItem('tenant_' + tenantID);
  loadDetails();
}
