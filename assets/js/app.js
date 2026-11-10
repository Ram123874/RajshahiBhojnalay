const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const loginMessage =
        document.getElementById("loginMessage");


    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {

        // Login successful
        localStorage.setItem(
            "adminLoggedIn",
            "true"
        );

        loginMessage.style.color = "green";

        loginMessage.textContent =
            "Login Successful ✅";


        // Open Mess Dashboard
        setTimeout(function () {

            window.location.href =
                "messdashboard.html";

        },2000);


    } else {

        loginMessage.style.color = "red";

        loginMessage.textContent =
            "❌ Wrong Username or Password";

    }

});