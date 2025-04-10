import Stripe from "stripe";
import EasyPostClient from "@easypost/api";

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
    const address = await client.Address.create({
      verify: true,
      street1: shippingDetails.address.line1,
      street2: shippingDetails.address.line2,
      city: shippingDetails.address.city,
      state: shippingDetails.address.state,
      zip: shippingDetails.address.postal_code,
      country: shippingDetails.address.country,
    });

    console.log(address.verifications.delivery.success);
    return address.verifications.delivery.success;
  } catch (e) {
    console.log("error validating address: ", e);
    return false;
  }
}

// Return an array of the updated shipping options or the original options if no update is needed.
function calculateShippingOptions(shippingDetails, session) {
  // TODO: Remove error and implement...
  // throw new Error(`
  //   Calculate shipping options based on the customer's shipping details and the
  //   Checkout Session's line items.
  // `);
  console.log("calculate shipping options!");
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  console.log("body: ", body);
  // const name = body.name;
  const { checkout_session_id, shipping_details } = body;

  // 1. Retrieve the Checkout Session
  const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

  // console.log("session: ",session);

  // 2. Validate the shipping details
  // validateShippingDetails(shipping_details);
  const addressValid = await validateShippingDetails(shipping_details);
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
  calculateShippingOptions(shipping_details, session);
  // const shippingOptions = calculateShippingOptions(shipping_details, session);
  const shippingOptions = [
    {
      shipping_rate_data: {
        type: "fixed_amount", // Required: Must be 'fixed_amount' here
        fixed_amount: {
          amount: 500, // Amount in cents (e.g., $5.00)
          currency: "usd", // Match the session currency
        },
        display_name: "Standard Ground Shipping",
        // Optional: Delivery estimate
        delivery_estimate: {
          minimum: {
            unit: "business_day",
            value: 5,
          },
          maximum: {
            unit: "business_day",
            value: 7,
          },
        },
      },
    },
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: 1500, // $15.00
          currency: "usd",
        },
        display_name: "Express 2-Day Shipping",
        delivery_estimate: {
          minimum: {
            unit: "business_day",
            value: 1,
          },
          maximum: {
            unit: "business_day",
            value: 2,
          },
        },
      },
    },
    {
      // Example: Free shipping option (dynamically)
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: 0, // $0.00
          currency: "usd",
        },
        display_name: "Free Standard Shipping (7-10 days)",
        delivery_estimate: {
          minimum: {
            unit: "business_day",
            value: 7,
          },
          maximum: {
            unit: "business_day",
            value: 10,
          },
        },
      },
    },
  ];

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
