const userData = {
    facebookStatus: null,
    coords: null,
    tel: null,
    subscribed: false
}

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

        if(e.event === 'opt_in') {
            userData.subscribed = true
        }

        updateUIStatus()
    });

    checkTel()
};

function checkLoginState() {
    FB.getLoginStatus(statusChangeCallback)
}

function statusChangeCallback(response) {

    if (response.status === 'connected' & userData.facebookStatus === 'unknown') {
        // Have changed from not logged in to logged in
        // Reload the page in order for the Subscribe to Messenger button to render
        window.location.reload()
    } else {
        // The person is not logged into your app or we are unable to tell.
        // document.getElementById('status').innerHTML = 'Please log into this app.';
        
    }

    userData.facebookStatus = response.status;

    updateUIStatus()
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

    updateUIStatus()
}

function updateUIStatus() {
    let checkedCount = 0;

    const loginStatusEl = document.getElementById('login_status')
    if(userData.facebookStatus === 'connected') {
        loginStatusEl.classList.add('checked')
        ++checkedCount
    }
    else {
        loginStatusEl.classList.remove('checked')
    }

    const positionStatusEl = document.getElementById('position_status')
    if(userData.coords) {
        ++checkedCount
        positionStatusEl.classList.add('checked')
    }
    else {
        positionStatusEl.classList.remove('checked')
    }

    const telStatusEl = document.getElementById('tel_status')
    if(userData.tel) {
        ++checkedCount
        telStatusEl.classList.add('checked')
    }
    else {
        telStatusEl.classList.remove('checked')
    }

    const subscribedStatusEl = document.getElementById('subscribe_status')
    if(userData.subscribed) {
        ++checkedCount
        subscribedStatusEl.classList.add('checked')
    }
    else {
        subscribedStatusEl.classList.remove('checked')
    }

    const statusTextEl = document.getElementById('status_text');
    if(checkedCount === 4) {
        statusTextEl.innerText = 'You\'re all set for Santa Delivery Notifications 🎅'
        statusTextEl.classList.add('checked')
    }
    else {
        statusTextEl.innerText = 'Please perform all required actions to receive notifications.'
        statusTextEl.classList.remove('checked')
    }
}