document.addEventListener("DOMContentLoaded", function () {

    function showMessage(id, text, type) {

        const message = document.getElementById(id);

        if (message) {

            message.className = "form-message " + type;

            message.textContent = text;

        }

    }


    /* SIGN UP */

    const signupForm =
        document.getElementById("signupForm");

    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                const password =
                    document.getElementById("password");

                const confirmPassword =
                    document.getElementById("confirmPassword");


                if (password.value !== confirmPassword.value) {

                    confirmPassword.setCustomValidity(
                        "Passwords do not match."
                    );

                    showMessage(
                        "signupMessage",
                        "Passwords do not match.",
                        "error"
                    );

                } else {

                    confirmPassword.setCustomValidity("");

                }


                if (!signupForm.checkValidity()) {

                    signupForm.reportValidity();

                    return;

                }


                showMessage(
                    "signupMessage",
                    "Account created successfully!",
                    "success"
                );

                signupForm.reset();

            }
        );

    }


    /* LOGIN */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!loginForm.checkValidity()) {

                    loginForm.reportValidity();

                    return;

                }


                showMessage(
                    "loginMessage",
                    "Login details are valid!",
                    "success"
                );

            }
        );

    }


    /* PROFILE */

    const profileForm =
        document.getElementById("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!profileForm.checkValidity()) {

                    profileForm.reportValidity();

                    return;

                }


                showMessage(
                    "profileMessage",
                    "Profile information saved successfully!",
                    "success"
                );

            }
        );

    }


    /* APPLICATIONS */

    const applicationForm =
        document.getElementById("applicationForm");

    if (applicationForm) {

        applicationForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!applicationForm.checkValidity()) {

                    applicationForm.reportValidity();

                    return;

                }


                showMessage(
                    "applicationMessage",
                    "Application added successfully!",
                    "success"
                );

                applicationForm.reset();

            }
        );

    }


    /* ALERTS */

    const alertForm =
        document.getElementById("alertForm");

    if (alertForm) {

        alertForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!alertForm.checkValidity()) {

                    alertForm.reportValidity();

                    return;

                }


                showMessage(
                    "alertMessage",
                    "Job alert created successfully!",
                    "success"
                );

                alertForm.reset();

            }
        );

    }


    /* FIND JOBS */

    const jobSearchForm =
        document.getElementById("jobSearchForm");

    if (jobSearchForm) {

        jobSearchForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!jobSearchForm.checkValidity()) {

                    jobSearchForm.reportValidity();

                    return;

                }


                showMessage(
                    "jobMessage",
                    "Search filters are valid!",
                    "success"
                );

            }
        );

    }


    /* FRESH JOBS */

    const freshForm =
        document.getElementById("freshForm");

    if (freshForm) {

        freshForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!freshForm.checkValidity()) {

                    freshForm.reportValidity();

                    return;

                }


                showMessage(
                    "freshMessage",
                    "Filters applied successfully!",
                    "success"
                );

            }
        );

    }


    /* HOME SEARCH */

    const homeSearchForm =
        document.getElementById("homeSearchForm");

    if (homeSearchForm) {

        homeSearchForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                if (!homeSearchForm.checkValidity()) {

                    homeSearchForm.reportValidity();

                    return;

                }


                window.location.href = "jobs.html";

            }
        );

    }

});