const express = require("express");
const router = express.Router();
const rentals_db = require("../models/rentals_db");
const bodyParser = require('body-parser');
const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const Handlebars = require('handlebars');

// Define the helper function
Handlebars.registerHelper('role', function(user, role, options) {
  if (user.role === role) {
    return options.fn(this);
  } else {
    if (options && options.inverse) {
      return options.inverse(this);
    } else {
      return '';
    }
  }
});
Handlebars.registerHelper('ifEqual', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});



require('dotenv').config({ path: './config/.env' });  // load environment variables from .env file
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// Set up body-parser middleware
router.use(bodyParser.urlencoded({ extended: false }));

const session = require('express-session');
// Set up session middleware
router.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false
}));

// Set up middleware to pass session data to views
router.use((req, res, next) => {
  res.locals.firstName = req.session.firstName;
  res.locals.logoutLink = req.session.logoutLink;
  res.locals.role = req.session.role;
  next();
});
// Set up router middleware
// app.use(router);
router.get("/", async (req, res) => {
  try {
    const rentals = await RentalModel.find({}).lean();
    res.render("general/home", { rentals, ...res.locals });
  } catch (err) {
    console.error(err);
    res.send('Failed to fetch rentals');
  }
});

Handlebars.registerHelper('multiply', function(num1, num2) {
  return num1 * num2;
});

router.post('/cart', (req, res) => {
  RentalModel.findById(req.body.rentalId)
    .lean()
    .then((rental) => {
      if (!rental) throw new Error('Rental not found');

      req.session.cart = req.session.cart || {
        rentals: [],
        subtotal: 0,
        vat: 0,
        total: 0,
      };

      const newRental = {
        rentalId: rental._id,
        headline: rental.headline,
        city: rental.city,
        province: rental.province,
        pricePerNight: rental.pricePerNight,
        nightsReserved: 1,
        imageUrl: rental.imageUrl,
      };
      req.session.cart.rentals.push(newRental);

      const { pricePerNight } = rental;
      req.session.cart.subtotal += pricePerNight;
      req.session.cart.vat = req.session.cart.subtotal * 0.1;
      req.session.cart.total = req.session.cart.subtotal + req.session.cart.vat;

      res.redirect('cart');
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('There was an error adding the rental to the cart.');
    });
});

router.post('/cart/update', (req, res) => {
  const { rentalId, nightsReserved } = req.body;
  const { cart } = req.session;

  const rentalToUpdate = cart.rentals.find(rental => rental.rentalId === rentalId);

  if (!rentalToUpdate) {
    return res.status(404).send('Rental not found in shopping cart');
  }

  rentalToUpdate.nightsReserved = parseInt(nightsReserved);
  const subtotal = cart.rentals.reduce((total, rental) => total + (rental.pricePerNight * rental.nightsReserved), 0);
  cart.subtotal = subtotal;
  cart.vat = cart.subtotal * 0.1;
  cart.total = cart.subtotal + cart.vat;

  res.redirect('/cart');
});

router.post('/cart/remove', (req, res) => {
  const { rentalId } = req.body;
  const { cart } = req.session;
  const newRentals = cart.rentals.filter(rental => rental.rentalId !== rentalId);
  if (newRentals.length === cart.rentals.length) {
  return res.status(404).send('Rental not found in shopping cart');
  }
  const subtotal = newRentals.reduce((total, rental) => total + (rental.pricePerNight * rental.nightsReserved), 0);
  const vat = subtotal * 0.1;
  const total = subtotal + vat;
  req.session.cart = {...cart,rentals: newRentals,subtotal,vat, total };
  res.redirect('/cart');
  });
  
  router.post('/cart/checkout', async (req, res) => {
    const { user, cart } = req.session;
  
    const emailTemplate = `
    <html>
      <body>
        <h1>Order Confirmation</h1>
        <p>Dear ${res.locals.firstName},</p>
        <p>Thank you for your purchase at our website! Below are the details of your order:</p>
        <table style="border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid black;">Houses</th>
              <th style="border: 1px solid black;">No. of Nights Reserved</th>
              <th style="border: 1px solid black;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${cart.rentals.map(rental => `
              <tr>
                <td style="border: 1px solid black;">${rental.headline} (${rental.city}, ${rental.province})</td>
                <td style="border: 1px solid black;">Nights Reserved = ${rental.nightsReserved}</td>
                <td style="border: 1px solid black;">$${rental.pricePerNight * rental.nightsReserved}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="border: 1px solid black;">Subtotal:</td>
              <td style="border: 1px solid black;">$${cart.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="border: 1px solid black;">VAT (10%):</td>
              <td style="border: 1px solid black;">$${cart.vat.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="border: 1px solid black;">Total:</td>
              <td style="border: 1px solid black;">$${cart.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p>If you have any questions or concerns, please don't hesitate to contact our customer support team at sahilbhangu6177@gmail.com</p>
        <p>Thank you again for your purchase!</p>
      </body>
    </html>
  `;
  
  
    const emailMessage = {
      to: user.id,
      from: 'sahilbhangu6177@gmail.com',
      subject: 'Order Confirmation',
      html: emailTemplate
    };
    
    sgMail.send(emailMessage)
      .then(() => {
        req.session.cart = {
          rentals: [],
          subtotal: 0,
          vat: 0,
          total: 0
        };
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error to send email');
      });
    
    req.session.cart = {
      rentals: [],
      subtotal: 0,
      vat: 0,
      total: 0
    };
  
    res.redirect('/cart');
  });
  
router.get('/cart', (req, res) => {
  // Check if user is authenticated and has the role of customer
  if (!req.session.user || req.session.user.role !== 'customer') {
    res.status(401).render('Rentals/load-rentals', {errorMessage: 'You are not authorized to access cart list.' });
    return;
  }

  // Render a message greeting the customer
  res.render("general/cart", {
    title: 'Shopping Cart',
    cart: req.session.cart
  });
});

router.get("/registration", (req, res) => {
  res.render("general/signup");
});
router.post('/registration', (req, res) => {
  const { fname, lname, email, password } = req.body;
  const errors = {};

  // Check for null or empty values
  if (!fname) {
    errors.fname = 'First name is required.';
  }
  if (!lname) {
    errors.lname = 'Last name is required.';
  }
  if (!email) {
    errors.email = 'Email is required.';
  } else {
    // Check for valid email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else {
    // Check for valid password
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,12}$/;
    if (!passwordRegex.test(password)) {
      errors.password = 'Please enter a password between 8 to 12 characters and containing at least one lowercase letter, one uppercase letter, one number and one symbol.';
    }
  }

  if (Object.keys(errors).length === 0) {
    const newUser = new userModel({ fname, lname, email, password});
    newUser.save()
      .then(() => {
        // Send welcome email
        const msg = {
          to: email,
          from: 'sahilbhangu6177@gmail.com',
          subject: 'Welcome to Online Housing System!',
          text: `Hello ${fname} ${lname},\n\nWelcome to Online Housing System! We're excited to have you on board.\n\nBest regards,\n[Your name]`,
          html: `<p>Hello ${fname} ${lname},</p><p>Welcome to Online Housing System! We're excited to have you on board.</p><p>Best regards,</p><p>[Sahil Deep Singh]</p>`,
        };

        sgMail.send(msg);
        res.render('general/welcome', { fname, lname });
      })
      .catch((err) => {
        let errorMessage;
        if (err.code === 11000 && err.keyPattern.email === 1) {
          errorMessage = 'There is already an account for this email address.';
        } else {
          console.error(err);
        }
        res.render('general/signup', { errors: { errorMessage }, formData: req.body });
      });
  } else {
    res.render('general/signup', { errors, formData: req.body });
  }
});


router.get("/login", (req, res) => {
  if (!req.session.user){
  res.render("general/login");
}
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  let emailInvalid, passwordInvalid, emailValue, passwordValue;

  // Check if the email and password are provided
  if (!email) {
    emailInvalid = 'Please enter your email.';
  } else {
    emailValue = email;
  }

  if (!password) {
    passwordInvalid = 'Please enter your password.';
  } else {
    passwordValue = password;
  }

  // If email or password are invalid, render the login page with an error message
  if (emailInvalid || passwordInvalid) {
    res.render('general/login', {
      errorMessage: 'Invalid email or password. Please try again.',
      emailInvalid,
      passwordInvalid,
      emailValue,
      passwordValue
    });
    return;
  }

  try {
    // Check if the email is in the database
    const user = await userModel.findOne({ email });

    if (!user) {
      // If the user is not found, render the login page with an error message
      res.render('general/login', {
        errorMessage: 'Invalid email or password. Please try again.',
        emailValue,
        passwordValue
      });
      return;
    }

    // Compare the password with the hash in the database
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // If the password is incorrect, render the login page with an error message
      res.render('general/login', {
        errorMessage: 'Invalid email or password. Please try again.',
        emailValue,
        passwordValue
      });
      return;
    }

    // Check if the role is valid
    if (role !== 'dataentryclerk' && role !== 'customer') {
      res.render('general/login', {
        errorMessage: 'Invalid role selected. Please try again.',
        emailValue,
        passwordValue
      });
      return;
    }

    // Set the user's first name and logout link in the session
    req.session.firstName = user.fname;
    req.session.logoutLink = '/logout';
    req.session.role = role;

    // If the credentials are valid, create a session to maintain user state until the user logs out
    req.session.user = { id: user.email, role };

    // Redirect the user to the appropriate page
    if (role === 'dataentryclerk') {
      res.redirect('/Rentals/list');
    } else {
      res.redirect('/cart');
    }

  } catch (error) {
    console.error(error);
    res.render('general/login', {
      errorMessage: 'An error occurred. Please try again later.',
      emailValue,
      passwordValue
    });
  }
});

const RentalModel = require('../models/rentalModel');
const somedata = require('../models/rentals_db');
router.get('/load-data/rentals', async (req, res) => {
  // Check if user is logged in and has the appropriate role
  if (req.session.role !== 'dataentryclerk') {
    res.status(401).render('Rentals/load-rentals', {errorMessage: 'You are not authorized to load rentals' });
    return;
  }

  try {
    const count = await RentalModel.count();
    if (count === 0) {
      await RentalModel.insertMany(somedata);
      res.render('Rentals/load-rentals', { successMessage: 'Added rentals to the database.' });
    } else {
      res.render('Rentals/load-rentals', { successMessage: 'Rentals have already been added to the database.' });
    }
  } catch (err) {
    res.render('Rentals/load-rentals', { errorMessage: 'There was an issue while loading the rental data into the database.' + err });
  }
});


router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
    } else {
      res.redirect('/login');
    }
  });
});




module.exports = router;