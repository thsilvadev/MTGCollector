//Tools
require(`dotenv`).config();

const knex = require("../database/index");
const nodeMailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
/*
    

  ______   ______   .__   __. .___________.    ___       ______ .___________.
 /      | /  __  \  |  \ |  | |           |   /   \     /      ||           |
|  ,----'|  |  |  | |   \|  | `---|  |----`  /  ^  \   |  ,----'`---|  |----`
|  |     |  |  |  | |  . `  |     |  |      /  /_\  \  |  |         |  |     
|  `----.|  `--'  | |  |\   |     |  |     /  _____  \ |  `----.    |  |     
 \______| \______/  |__| \__|     |__|    /__/     \__\ \______|    |__|     
                                                                             
 

*/
async function mainMail(name, email, subject, message) {
  const transporter = await nodeMailer.createTransport({
    host: "box.bestcontact.email",
    port: 465,
    secure: true,
    auth: {
      user: "noreply@mtgchest.com",
      pass: process.env.NOREPLY_PASSWORD,
    }
  });

  //Some sanitization is necessary, as the JSON Literal comes with \n for newlines and we need to translate it to HTML <br> tag. 
  const htmledMessage = message.replace(/\n/g, '<br>');

  //Also did some <b/> tags and <br> tags to better format our email bodies from Contact Form.
  const mailOption = {
    from: "noreply@mtgchest.com",
    to: "contact@mtgchest.com",
    subject: `${subject} // ${email}`, /* I want it to display the subject and the email right in the inbox */
    html: `You got a message from<br><b>Email</b> : ${email}<br><b>Name:</b> ${name}<br><b>Subject:</b> ${subject}<br><b>Message:</b><br> ${htmledMessage}`,
  };

  try {
    await transporter.sendMail(mailOption);
    return Promise.resolve("Message Sent Successfully!");
  } catch (error) {
    return Promise.reject(error);
  }
}

/*

 _______ .___  ___.      ___       __   __                                                                            
|   ____||   \/   |     /   \     |  | |  |                                                                           
|  |__   |  \  /  |    /  ^  \    |  | |  |                                                                           
|   __|  |  |\/|  |   /  /_\  \   |  | |  |                                                                           
|  |____ |  |  |  |  /  _____  \  |  | |  `----.                                                                      
|_______||__|  |__| /__/     \__\ |__| |_______|                                                                      
                                                                                                                      
  ______   ______   .__   __.  _______  __  .______      .___  ___.      ___   .___________. __    ______   .__   __. 
 /      | /  __  \  |  \ |  | |   ____||  | |   _  \     |   \/   |     /   \  |           ||  |  /  __  \  |  \ |  | 
|  ,----'|  |  |  | |   \|  | |  |__   |  | |  |_)  |    |  \  /  |    /  ^  \ `---|  |----`|  | |  |  |  | |   \|  | 
|  |     |  |  |  | |  . `  | |   __|  |  | |      /     |  |\/|  |   /  /_\  \    |  |     |  | |  |  |  | |  . `  | 
|  `----.|  `--'  | |  |\   | |  |     |  | |  |\  \----.|  |  |  |  /  _____  \   |  |     |  | |  `--'  | |  |\   | 
 \______| \______/  |__| \__| |__|     |__| | _| `._____||__|  |__| /__/     \__\  |__|     |__|  \______/  |__| \__| 
                                                                                                                      

*/

async function configMail(email) {
  const transporter = await nodeMailer.createTransport({
    host: "box.bestcontact.email",
    port: 465,
    secure: true,
    auth: {
      user: "noreply@mtgchest.com",
      pass: process.env.NOREPLY_PASSWORD,
    }
  });

  const emailToken = jwt.sign({ email: email }, process.env.CONFIRM_EMAIL_TOKEN_TAG)

  const url = `http://mtgchest.com/confirmation/${emailToken}`

  //Also did some <b/> tags and <br> tags to better format our email bodies from Contact Form.
  const mailOption = {
    from: "noreply@mtgchest.com",
    to: email,
    subject: `MTG Chest: Confirmation Email`, /* I want it to display the subject and the email right in the inbox */
    html: `Please, click <a href="${url}">here</a> to <strong>confirm your email</strong> and finish sign in:<br><br><a href="${url}">${url}</a>`,
  };

  try {
    await transporter.sendMail(mailOption);
    return Promise.resolve("Message Sent Successfully!");
  } catch (error) {
    return Promise.reject(error);
  }
}

/*
.______       _______     _______. _______ .___________.                                            
|   _  \     |   ____|   /       ||   ____||           |                                            
|  |_)  |    |  |__     |   (----`|  |__   `---|  |----`                                            
|      /     |   __|     \   \    |   __|      |  |                                                 
|  |\  \----.|  |____.----)   |   |  |____     |  |                                                 
| _| `._____||_______|_______/    |_______|    |__|                                                 
                                                                                                    
.______      ___           _______.     _______.____    __    ____  ______   .______       _______  
|   _  \    /   \         /       |    /       |\   \  /  \  /   / /  __  \  |   _  \     |       \ 
|  |_)  |  /  ^  \       |   (----`   |   (----` \   \/    \/   / |  |  |  | |  |_)  |    |  .--.  |
|   ___/  /  /_\  \       \   \        \   \      \            /  |  |  |  | |      /     |  |  |  |
|  |     /  _____  \  .----)   |   .----)   |      \    /\    /   |  `--'  | |  |\  \----.|  '--'  |
| _|    /__/     \__\ |_______/    |_______/        \__/  \__/     \______/  | _| `._____||_______/ 
                                                                                                    
*/

async function resetMail(email) {
  const transporter = await nodeMailer.createTransport({
    host: "box.bestcontact.email",
    port: 465,
    secure: true,
    auth: {
      user: "noreply@mtgchest.com",
      pass: process.env.NOREPLY_PASSWORD,
    }
  });

  const resetToken = jwt.sign({ email: email }, process.env.RESET_PASSWORD_TOKEN_TAG)

  const url = `http://mtgchest.com/reset-confirmation/${resetToken}`

  //Also did some <b/> tags and <br> tags to better format our email bodies from Contact Form.
  const mailOption = {
    from: "noreply@mtgchest.com",
    to: email,
    subject: `MTG Chest: Reset Password`, /* I want it to display the subject and the email right in the inbox */
    html: `Please, click <a href="${url}">here</a> to <strong>reset your password</strong>:<br><br><a href="${url}">${url}</a>`,
  };

  try {
    await transporter.sendMail(mailOption);
    console.log('Reset password email sent to', email);
    return Promise.resolve("Message Sent Successfully!");
  } catch (error) {
    return Promise.reject(error);
  }
}

module.exports = {

  //As user submits a contact form, send it to noreply@mtgchest.com
  async contactForm(req, res) {
    const { yourname, youremail, yoursubject, yourmessage } = req.body;
    try {
      await mainMail(yourname, youremail, yoursubject, yourmessage);

      res.send("Message Successfully Sent!");
    } catch (error) {
      res.send("Message Could not be Sent");
    }
  }

  ,
  //As user registers or try to login in a not confirmed account > send email to confirm.
  //This function is being used in usersController.js .
  async confirmEmail(req) {
    const { email } = req.body;
    try {
      await configMail(email);

      return res.send("Confirmation email successfully sent!");
    } catch (error) {
      return res.send("Confirmation email could not be Sent");
    }
  }

  ,

  //Check if user clicked on the link sent on email with corresponding emailToken (jwt)
  async checkUserConfirm(req, res) {


    const { emailToken } = req.params;
    const { confirmed } = req.body;
    console.log(confirmed);
    try {

      const data = jwt.verify(emailToken, process.env.CONFIRM_EMAIL_TOKEN_TAG);
      if (!data.email) {
        return res.sendStatus(401)
      } else {
        await knex('users')
          .where('email', data.email)
          .update({
            confirmed: confirmed
          });
        console.log(`User successfully confirmed email ${data.email}. Registration complete.`);
        res.status(200).json({ message: "You have successfully confirmed your email. You may proceed to login." })
      }



    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(401).json({ error: 'Sorry. Something went wrong :/' });
    }
  }

  ,

  async resetPassword(req, res) {
    const { email } = req.body;

    if (!email) {
      return res.sendStatus(401)
    } else {
      const isUser = await knex('users')
        .where('email', email);

      if (!isUser) {
        return res.status(401).json({ unregistered: 'We sent you an email with the link to reset your password. Please check your email inbox.' })
      } else {
        try {
          await resetMail(email)
          return res.status(200).json({ message: "Please, click on the link we sent to your email to reset your password." });
        } catch (error) {
          return res.status(401).json({ error: "Password reset email could not be Sent" });
        }

      }
    }
  }

  ,

  async newPassword(req, res) {
    const { resetToken } = req.params;
    const { password } = req.body;

    const data = jwt.verify(resetToken, process.env.RESET_PASSWORD_TOKEN_TAG)

    if (!data.email) {
      return res.sendStatus(401).json({ error: 'something went wrong. Email not found.' })
    } else {
      bcryptjs.hash(password, 10, async (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ error: "Error hashing password." });
        }
        const result = await knex('users')
          .where('email', data.email)
          .update({
            password: hashedPassword
          });
        console.log(`User ${data.email} successfully reset password.`);
      })

      res.status(200).json({ message: "You have successfully reset your password. You may proceed to login." })
    }
  }
}




/* 
  setting service: 'gmail' is same as providing the settings manually in the transport object above.

{
  host: "smtp.gmail.com",
  port: 465,
  secure: true
}

https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json
*/

