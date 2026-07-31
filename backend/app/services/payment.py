"""Stripe payment integration — placeholder for future implementation."""

# from app.config import settings
# import stripe
# stripe.api_key = settings.stripe_secret_key


async def create_checkout_session(user_id: int, price_id: str) -> str:
    """
    Create a Stripe Checkout Session for premium subscription.

    Args:
        user_id: The user's database ID.
        price_id: The Stripe price ID for the subscription plan.

    Returns:
        The checkout session URL to redirect the user to.
    """
    # TODO: Implement when Stripe is configured
    # session = stripe.checkout.Session.create(
    #     customer_email=user.email,
    #     payment_method_types=["card"],
    #     line_items=[{"price": price_id, "quantity": 1}],
    #     mode="subscription",
    #     success_url=f"{settings.frontend_url}/generate?session_id={{CHECKOUT_SESSION_ID}}",
    #     cancel_url=f"{settings.frontend_url}/subscribe",
    # )
    # return session.url
    raise NotImplementedError("Stripe checkout not yet configured")


async def handle_webhook(payload: bytes, sig_header: str) -> None:
    """Handle Stripe webhook events."""
    # TODO: Implement when Stripe is configured
    # event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    # if event["type"] == "checkout.session.completed":
    #     # Grant premium access
    #     pass
    raise NotImplementedError("Stripe webhook not yet configured")
