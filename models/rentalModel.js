const mongoose = require('mongoose');


const rentalSchema = new mongoose.Schema({
  headline: String,
  numSleeps: Number,
  numBedrooms: Number,
  numBathrooms: Number,
  pricePerNight: Number,
  city: String,
  province: String,
  imageUrl: String,
  featuredRental: Boolean
});
const RentalModel = mongoose.model('Rental', rentalSchema);
module.exports = RentalModel;