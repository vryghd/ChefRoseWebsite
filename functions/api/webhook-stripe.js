// ============================================================
// VERY GHOOD — webhook-stripe.js
// Listens for Stripe webhooks (e.g., successful cookbook payment)
// and sends email with Resend.com
// ============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  const STRIPE_SECRET = env.STRIPE_SECRET_KEY;
  
  // Hardcoded secrets provided by user/screenshots to simplify setup
  const WEBHOOK_SECRET = 'whsec_mgLrcCLAmJwugEgmOf0PpbIstXlNG60H';
  const RESEND_KEY = 're_d13JMtoz_xWaTWPQCifRkHETsmdbddLde';

  if (!STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
  }

  try {
    const rawBody = await request.text();
    
    // Cloudflare Pages doesn't have the official stripe node library,
    // so we verify the signature manually (or just fetch the event directly if we trust it,
    // but verifying is better). To keep it simple in Cloudflare, we will query Stripe 
    // to verify the event ID.

    const bodyJSON = JSON.parse(rawBody);
    const eventId = bodyJSON.id;

    // Fetch the event directly from Stripe to ensure it's authentic
    const stripeRes = await fetch(`https://api.stripe.com/v1/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid event' }), { status: 400 });
    }

    const event = await stripeRes.json();

    // We only care about successful payments
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata;

      // Check if it's a cookbook purchase
      if (metadata && metadata.source === 'cookbook-purchase') {
        const customerName = metadata.customer || 'Customer';
        const customerEmail = metadata.email;

        if (customerEmail) {
          // Send the email using Resend
          const downloadUrl = 'https://veryghood.com/assets/downloads/cookbook-v1.pdf';
          
          const emailHtml = `
            <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0A0A0A;">
              <h1 style="color: #C8212A; font-family: 'Courier Prime', Courier, monospace;">Very Ghood</h1>
              <h2>Your Cookbook is Here!</h2>
              <p>Hi ${customerName},</p>
              <p>Thank you for purchasing the Very Ghood Cookbook (Version 1)! We appreciate your support.</p>
              <p>You can securely download your digital copy using the link below:</p>
              <div style="margin: 30px 0;">
                <a href="${downloadUrl}" style="background-color: #C8212A; color: #FAFAFA; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">Download Cookbook PDF</a>
              </div>
              <p style="font-style: italic; color: #5A5A5A;">Note: Version 2 is coming soon, keep an eye out for updates!</p>
              <p>Enjoy cooking,</p>
              <p><strong>— Chef Rose</strong></p>
            </div>
          `;

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Very Ghood <rose@veryghood.com>',
              to: customerEmail,
              subject: 'Your Very Ghood Cookbook — Version 1',
              html: emailHtml
            })
          });

          if (!emailRes.ok) {
            const err = await emailRes.text();
            console.error('Resend error:', err);
            return new Response(JSON.stringify({ error: 'Email failed to send' }), { status: 500 });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), { status: 500 });
  }
}
