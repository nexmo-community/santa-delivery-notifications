const userData = {}

// Facebook
window.fbAsyncInit = function () {
    FB.init({
        appId: CONFIG.FACEBOOK_APP_ID,
        cookie: true,  // enable cookies to allow the server to access the session
        xfbml: true,  // parse social plugins on this page
        version: 'v2.8' // use graph api version 2.8
    });

    FB.getLoginStatus(statusChangeCallback)

    FB.Event.subscribe('send_to_messenger', function(e) {
        // callback for events triggered by the plugin
        console.log(e)
    });
};

function checkLoginState() {
    FB.getLoginStatus(statusChangeCallback)
}

let previousStatus = null;
function statusChangeCallback(response) {

    console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected' & previousStatus === 'unknown') {
        // Have changed from not logged in to logged in
        // Reload the page in order for the Subscribe to Messenger button to render
        window.location.reload()
    } else {
        // The person is not logged into your app or we are unable to tell.
        // document.getElementById('status').innerHTML = 'Please log into this app.';
        
    }

    previousStatus = response.status;
}

(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Location
function getLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
        userData.coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        }

        updateUserData()
    })
}

// SMS Fallback
function checkTel() {
    userData.tel = document.getElementById('sms_tel').value

    updateUserData()
}

// 
function updateUserData() {
    console.log(userData)

    axios.post('/user_data', userData)
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });
}