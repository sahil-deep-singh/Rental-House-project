const somedata = [
    {  
        headline:"NEW BUILT HOUSE: 170 Havelock Dr",
        numSleeps:2,
        numBedrooms:1,
        numBathrooms:1,
        pricePerNight:125.99,
        city: "Brampton",
        province: "Ontario",
        imageUrl: "/Photos/h1.jpeg",
        featuredRental: true
  },
  {
    headline:"Semi-Ditached House: 80 kesteven Cres",
    numSleeps:3,
    numBedrooms:1,
    numBathrooms:1,
    pricePerNight:120.99,
    city: "Brampton",
    province: "Ontario",
    imageUrl: "/Photos/h2.jpg",
    featuredRental: true
},
{
    headline:"Town House: 310 HENSON ROAD",
    numSleeps:5,
    numBedrooms:4,
    numBathrooms:3,
    pricePerNight:199.99,
    city: "Missisauga",
    province: "Ontario",
    imageUrl: "/Photos/h3.jpg",
    featuredRental: true
},
{
    headline:"Apartment: 569 Sheppard Ave W",
    numSleeps:2,
    numBedrooms:1,
    numBathrooms:1,
    pricePerNight:100.99,
    city: "NorthYork",
    province: "Ontario",
    imageUrl: "/Photos/H4.jpg",
    featuredRental: true
},
{
    headline:"Furnished HOUSE: 69 Daden Oaks Dr",
    numSleeps:4,
    numBedrooms:3,
    numBathrooms:3,
    pricePerNight:220.99,
    city: "Brampton",
    province: "Ontario",
    imageUrl: "/Photos/h5.jpg",
    featuredRental: true
},
{
    headline:"Sea Face House: 77 Marine Dr",
    numSleeps:3,
    numBedrooms:2,
    numBathrooms:1,
    pricePerNight:299.99,
    city: "Toronto",
    province: "Ontario",
    imageUrl: "/Photos/H6.jpg",
    featuredRental: true
},
];
module.exports = somedata;

module.exports.getFeaturedRentals = function(){
return somedata;
}

module.exports.getvisiblefeaturedRentals = function(){
    let filtered = [];
    for(let i = 0; i <somedata.length; i++)
    {
        if(somedata[i].featuredRental)
        {
            filtered.push(somedata[i]);
        }
    }
    return filtered;
}

module.exports.getRentalsByCityAndProvince = function() {
let output = [];
somedata.forEach(dataren => {
    let cityAProvince = dataren.city + ', ' + dataren.province;
    let searchcp = output.find(r => r.cityAProvince === cityAProvince);
    if (searchcp) {
        searchcp.somedata.push(dataren);
    } else {
        output.push({
            cityAProvince: cityAProvince,
            somedata: [dataren]
        });
    }
});
return output;
}
