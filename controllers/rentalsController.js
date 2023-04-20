const express = require('express');
const router = express.Router();
const rentals_db = require("../models/rentals_db");
const fs = require('fs');
const _ = require('lodash'); // import lodash library

router.get('/', async (req, res) => {
  console.log("Role:", res.locals.role);
  try {
    const rentals = await RentalModel.find({}).lean();
    const groupedRentals = _.groupBy(rentals, rental => rental.city + ', ' + rental.province); // group rentals by city and province

    res.render('Rentals/rentals', { groupedRentals, role: res.locals.role }); // pass grouped rentals to template
  } catch (err) {
    console.error(err);
    res.send('Failed to fetch rentals');
  }
});



// Route to display a message for data entry clerks

const RentalModel = require('../models/rentalModel');

router.get('/list', async (req, res) => {
   // Check if user is logged in and has the appropriate role
   if (req.session.role !== 'dataentryclerk') {
    res.status(401).render('Rentals/load-rentals', {errorMessage: 'You are not authorized to access list.' });
    return;
  }
  try {
    const rentals = await RentalModel.find({}).lean(); // Add `lean()` to get plain objects
    res.render('Rentals/list', { rentals });    
  } catch (err) {
    console.error(err);
    res.send('Failed to fetch rentals');
  }
});
// Route to display a message for data entry clerks
router.get('/add', (req, res) => {
   // Check if user is logged in and has the appropriate role
   if (req.session.role !== 'dataentryclerk') {
    res.status(401).render('Rentals/load-rentals', {errorMessage: 'You are not authorized to add rentals' });
    return;
  }
  res.render('Rentals/add'); // assumes you have set up a view engine and specified the view directory
});

router.post('/add', async (req, res) => {
  try {
    const featuredRental = req.body.featuredRental === 'on' ? true : false;
    const file = req.files.imageUrl;
    const filePath = 'assets/Photos/' + file.name;
    const imageUrl = '/Photos/' + file.name;

    // move the file to the desired location
    await file.mv(filePath);

    // create a new RentalModel instance with form data
    const rental = new RentalModel({
      headline: req.body.headline,
      numSleeps: req.body.numSleeps,
      numBedrooms: req.body.numBedrooms,
      numBathrooms: req.body.numBathrooms,
      pricePerNight: req.body.pricePerNight,
      city: req.body.city,
      province: req.body.province,
      imageUrl: imageUrl,
      featuredRental: featuredRental
    });

    // save the rental to the database
    await rental.save();

    // redirect to the rental listing page
    res.redirect('/Rentals/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/edit/:id', async (req, res) => {
   // Check if user is logged in and has the appropriate role
   if (req.session.role !== 'dataentryclerk') {
    res.status(401).render('Rentals/load-rentals', {errorMessage: 'You are not authorized to edit rentals' });
    return;
  }
  try {
    const rental = await RentalModel.findById(req.params.id).lean();
    res.render('Rentals/edit', { rental });
  } catch (err) {
    console.error(err);
    res.send('Failed to fetch rental');
  }
});

router.post('/edit/:id', async (req, res) => {
  try {
    const featuredRental = req.body.featuredRental === 'on' ? true : false;
    const rental = {
      headline: req.body.headline,
      numSleeps: req.body.numSleeps,
      numBedrooms: req.body.numBedrooms,
      numBathrooms: req.body.numBathrooms,
      pricePerNight: req.body.pricePerNight,
      city: req.body.city,
      province: req.body.province,
      featuredRental: featuredRental
    };
    if (req.files && req.files.image) {
      const file = req.files.image;
      const filePath = 'assets/Photos/' + file.name;
      const imageUrl = '/Photos/' + file.name;
      await file.mv(filePath);
      rental.imageUrl = imageUrl;
    }
    await RentalModel.findByIdAndUpdate(req.params.id, rental);
    res.redirect('/rentals/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// GET route for confirmation page
router.get('/remove/:id', async (req, res) => {
  try {
    const rental = await RentalModel.findById(req.params.id);
    res.render('remove', { rental });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST route for deleting rental and image file
router.post('/remove/:id', async (req, res) => {
  try {
    const rental = await RentalModel.findById(req.params.id);
    if (rental.imageUrl) {
      fs.unlinkSync(`assets${rental.imageUrl}`);
    }
    await RentalModel.findByIdAndRemove(req.params.id);
    res.redirect('/Rentals/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;