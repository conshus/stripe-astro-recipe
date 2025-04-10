import Stripe from "stripe";
import EasyPostClient from "@easypost/api";
import type { APIRoute } from "astro";

const stripe = new Stripe(import.meta.env.STRIPE_KEY);
const client = new EasyPostClient(import.meta.env.EASYPOST_API_KEY);

export const GET: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: "This was a GET!",
    })
  );
};

// Return a boolean indicating whether the shipping details are valid.
async function validateShippingDetails(shippingDetails) {
  console.log("validating address");
  // TODO: Remove error and implement...
  // throw new Error(`
  //   Validate the shipping details the customer has entered.
  // `);

  try {
    // const address = await client.Address.create({
    //   verify: true,
    //   street1: shippingDetails.address.line1,
    //   street2: shippingDetails.address.line2,
    //   city: shippingDetails.address.city,
    //   state: shippingDetails.address.state,
    //   zip: shippingDetails.address.postal_code,
    //   country: shippingDetails.address.country,
    // });

    const address = await client.Address.create({
      verify: true,
      ...shippingDetails,
    });

    console.log(address.verifications.delivery.success);
    return address.verifications.delivery.success;
  } catch (e) {
    console.log("error validating address: ", e);
    return false;
  }
}

function transformShippingRates(rates) {
  // Use reduce to build a map of unique rates, keyed by "carrier|service"
  const uniqueRatesMap = rates.reduce((acc, rate) => {
    // Create a unique key for each carrier and service combination
    const key = `${rate.carrier}|${rate.service}`;

    // If this combination hasn't been seen before, format and add it
    if (!acc[key]) {
      const formattedRate = {
        shipping_rate_data: {
          type: "fixed_amount", // Required type
          fixed_amount: {
            // Convert rate string to cents (integer)
            amount: Math.round(parseFloat(rate.retail_rate) * 100),
            // Ensure currency is lowercase
            currency: rate.currency.toLowerCase(),
          },
          // Create a display name from carrier and service
          display_name: `${rate.carrier} ${rate.service}`,
        },
      };

      // Determine the delivery days, preferring estimated days
      const deliveryDays = rate.est_delivery_days || rate.delivery_days;

      // Add optional delivery estimate if delivery days are available and positive
      if (deliveryDays && deliveryDays > 0) {
        formattedRate.shipping_rate_data.delivery_estimate = {
          minimum: {
            unit: "business_day",
            value: deliveryDays,
          },
          maximum: {
            unit: "business_day",
            value: deliveryDays, // Using the same value for min/max based on input
          },
        };
      }

      // Add the formatted rate to the accumulator map
      acc[key] = formattedRate;
    }
    // Return the accumulator for the next iteration
    return acc;
  }, {}); // Start with an empty object as the accumulator

  // Convert the values of the map (the unique formatted rates) into an array
  return Object.values(uniqueRatesMap);
}

// Return an array of the updated shipping options or the original options if no update is needed.
async function calculateShippingOptions(shippingDetails, session, parcel) {
  // TODO: Remove error and implement...
  // throw new Error(`
  //   Calculate shipping options based on the customer's shipping details and the
  //   Checkout Session's line items.
  // `);
  console.log("calculate shipping options!");
  const from_address = {
    street1: "300 N New York Ave #412",
    street2: "",
    city: "Winter Park",
    state: "FL",
    zip: "32789",
    country: "US",
    company: "conshus works, LLC",
  };
  try {
    const shipmentDetails = {
      to_address: {
        ...shippingDetails,
        // name: "Dr. Steve Brule",
        // street1: "179 N Harbor Dr",
        // city: "Redondo Beach",
        // state: "CA",
        // zip: "90277",
        // country: "US",
        // email: "dr_steve_brule@gmail.com",
        // phone: "4155559999",
      },
      from_address,
      // from_address: {
      //   street1: "417 montgomery street",
      //   street2: "FL 5",
      //   city: "San Francisco",
      //   state: "CA",
      //   zip: "94104",
      //   country: "US",
      //   company: "EasyPost",
      //   phone: "415-123-4567",
      // },
      parcel,
      // parcel: {
      //   length: 20.2,
      //   width: 10.9,
      //   height: 5,
      //   weight: 65.9,
      // },
    };

    const rates = await client.BetaRate.retrieveStatelessRates(shipmentDetails);

    console.log(rates);
    return rates;
  } catch (e) {
    console.log("error validating address: ", e);
    return [];
  }
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  console.log("body: ", body);
  // const name = body.name;
  const { checkout_session_id, shipping_details, parcel_details } = body;

  const easypostShipping = {
    name: shipping_details.name,
    street1: shipping_details.address.line1,
    street2: shipping_details.address.line2,
    city: shipping_details.address.city,
    state: shipping_details.address.state,
    zip: shipping_details.address.postal_code,
    country: shipping_details.address.country,
  };

  // 1. Retrieve the Checkout Session
  const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

  // console.log("session: ",session);

  // 2. Validate the shipping details
  // validateShippingDetails(shipping_details);
  const addressValid = await validateShippingDetails(easypostShipping);
  // if (!validateShippingDetails(shipping_details)) {
  if (!addressValid) {
    console.log("address not valid!");
    return new Response(
      JSON.stringify({
        type: "error",
        message:
          "We cannot ship to your address. Please choose a different address.",
      }),
      { status: 400 }
    );

    // return res.json({type: 'error', message: 'We cannot ship to your address. Please choose a different address.'});
  }

  // 3. Calculate the shipping options
  const easypostRates = await calculateShippingOptions(
    easypostShipping,
    session,
    parcel_details
  );
  console.log("easypostRates: ", easypostRates);
  const shippingOptions = transformShippingRates(easypostRates);
  // const shippingOptions = calculateShippingOptions(shipping_details, session);
  // const shippingOptions = [
  //   {
  //     shipping_rate_data: {
  //       type: "fixed_amount", // Required: Must be 'fixed_amount' here
  //       fixed_amount: {
  //         amount: 500, // Amount in cents (e.g., $5.00)
  //         currency: "usd", // Match the session currency
  //       },
  //       display_name: "Standard Ground Shipping",
  //       // Optional: Delivery estimate
  //       delivery_estimate: {
  //         minimum: {
  //           unit: "business_day",
  //           value: 5,
  //         },
  //         maximum: {
  //           unit: "business_day",
  //           value: 7,
  //         },
  //       },
  //     },
  //   },
  //   {
  //     shipping_rate_data: {
  //       type: "fixed_amount",
  //       fixed_amount: {
  //         amount: 1500, // $15.00
  //         currency: "usd",
  //       },
  //       display_name: "Express 2-Day Shipping",
  //       delivery_estimate: {
  //         minimum: {
  //           unit: "business_day",
  //           value: 1,
  //         },
  //         maximum: {
  //           unit: "business_day",
  //           value: 2,
  //         },
  //       },
  //     },
  //   },
  //   {
  //     // Example: Free shipping option (dynamically)
  //     shipping_rate_data: {
  //       type: "fixed_amount",
  //       fixed_amount: {
  //         amount: 0, // $0.00
  //         currency: "usd",
  //       },
  //       display_name: "Free Standard Shipping (7-10 days)",
  //       delivery_estimate: {
  //         minimum: {
  //           unit: "business_day",
  //           value: 7,
  //         },
  //         maximum: {
  //           unit: "business_day",
  //           value: 10,
  //         },
  //       },
  //     },
  //   },
  // ];

  console.log("shippingOptions: ", shippingOptions);

  // 4. Update the Checkout Session with the customer's shipping details and shipping options
  if (shippingOptions) {
    await stripe.checkout.sessions.update(checkout_session_id, {
      collected_information: { shipping_details },
      // shipping_options: shippingOptions,
      shipping_options: shippingOptions,
    });
    return new Response(
      JSON.stringify({
        type: "object",
        value: { succeeded: true },
      })
    );
    // return res.json({type:'object', value: {succeeded: true}});
  } else {
    return new Response(
      JSON.stringify({
        type: "error",
        message: "We can't find shipping options. Please try again.",
      })
    );

    //   return res.json({type:'error', message: "We can't find shipping options. Please try again."});
  }
};

export const DELETE: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: "This was a DELETE!",
    })
  );
};

export const ALL: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: `This was a ${request.method}!`,
    })
  );
};
