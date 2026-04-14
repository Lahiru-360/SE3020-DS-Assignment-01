import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
    {
        // --- Links to other services ---
        appointmentId: {
            type: String,
            required: true,
            index: true,        // queried often — by webhook and by frontend
        },
        patientId: {
            type: String,
            required: true,
        },

        // --- Money ---
        amount: {
            type: Number,
            required: true,     // e.g. 2500 = LKR 2,500 (LKR is zero-decimal in Stripe)
        },
        currency: {
            type: String,
            default: 'LKR',
            uppercase: true,
        },

        // --- Transaction lifecycle ---
        status: {
            type: String,
            enum: ['initiated', 'completed', 'failed', 'refunded'],
            default: 'initiated',
        },

        // --- How they paid ---
        paymentMethod: {
            type: String,
            enum: ['card', 'mock'],
            default: 'card',
        },

        // --- Stripe references ---

        // Created when Payment Service calls stripe.paymentIntents.create()
        // Used to match the incoming webhook to this transaction
        stripePaymentIntentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Returned by Stripe after payment succeeds
        // Proof that money actually moved
        stripeChargeId: {
            type: String,
            default: null,
        },

        // The short-lived secret sent to frontend so Stripe.js
        // can confirm the payment — never store long term but
        // useful for debugging during development
        stripeClientSecret: {
            type: String,
            default: null,
        },

        // --- Card metadata (PCI-safe — from Stripe charge object, NOT raw card data) ---
        // Stripe handles raw card data. These fields are safe to store.
        cardLast4: {
            type: String,
            default: null,      // e.g. "4242"
        },
        cardBrand: {
            type: String,
            default: null,      // e.g. "visa", "mastercard"
        },
        cardExpMonth: {
            type: Number,
            default: null,      // e.g. 12
        },
        cardExpYear: {
            type: Number,
            default: null,      // e.g. 2028
        },
        cardCountry: {
            type: String,
            default: null,      // e.g. "US"
        },

        // --- Failure tracking ---
        failureReason: {
            type: String,
            default: null,      // populated if status becomes 'failed'
        },

        // --- Webhook tracking ---
        webhookReceivedAt: {
            type: Date,
            default: null,      // timestamp when Stripe webhook arrived
        },
    },
    { timestamps: true }   // gives you createdAt and updatedAt automatically
);

const TransactionModel = mongoose.model('Transaction', TransactionSchema);
export default TransactionModel;