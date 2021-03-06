import BunqErrorHandler from "../Helpers/BunqErrorHandler";

export function scheduledPaymentsSetInfo(scheduled_payments, account_id) {
    return {
        type: "SCHEDULED_PAYMENTS_SET_INFO",
        payload: {
            scheduled_payments,
            account_id
        }
    };
}

export function scheduledPaymentsInfoUpdate(
    BunqJSClient,
    user_id,
    account_id,
    options = {
        count: 50,
        newer_id: false,
        older_id: false
    }
) {
    const failedMessage = window.t(
        "We failed to load the scheduled payments for this monetary account"
    );

    return dispatch => {
        dispatch(scheduledPaymentsLoading());

        BunqJSClient.api.schedulePayment
            .list(user_id, account_id, options)
            .then(scheduledPayments => {
                dispatch(
                    scheduledPaymentsSetInfo(scheduledPayments, account_id)
                );
                dispatch(scheduledPaymentsNotLoading());
            })
            .catch(error => {
                dispatch(scheduledPaymentsNotLoading());
                BunqErrorHandler(dispatch, error, failedMessage);
            });
    };
}

export function scheduledPaymentsLoading() {
    return { type: "SCHEDULED_PAYMENTS_IS_LOADING" };
}

export function scheduledPaymentsNotLoading() {
    return { type: "SCHEDULED_PAYMENTS_IS_NOT_LOADING" };
}

export function scheduledPaymentsClear() {
    return { type: "SCHEDULED_PAYMENTS_CLEAR" };
}
