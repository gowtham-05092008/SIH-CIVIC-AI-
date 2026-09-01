async function authRequest(){
  const cleanPhone = phone.trim();
  if(!cleanPhone){ setMessage("Please enter a mobile number."); return; }

  setAuthLoading(true);
  setMessage("");

  try {
    const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          console.log("Recaptcha solved");
        }
      });
    }

    const confirmation = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      window.recaptchaVerifier
    );

    window.confirmationResult = confirmation;
    setOtpSent(true);
    setMessage("OTP sent by SMS");
  } catch (e) {
    console.error(e);
    setMessage("Could not send OTP. Check your Firebase phone auth setup.");
    setOtpSent(false);
  } finally {
    setAuthLoading(false);
  }
}