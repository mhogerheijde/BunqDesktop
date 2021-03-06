import React from "react";
import Avatar from "material-ui/Avatar";
import Divider from "material-ui/Divider";
import IconButton from "material-ui/IconButton";
import {
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from "material-ui/List";

import DeleteIcon from "@material-ui/icons/Delete";

import LazyAttachmentImage from "../../Components/AttachmentImage/LazyAttachmentImage";
import MoneyAmountLabel from "../../Components/MoneyAmountLabel";

import scheduleTexts from "../../Helpers/ScheduleTexts";
import { formatMoney, humanReadableDate } from "../../Helpers/Utils";

const styles = {
    paper: {
        padding: 24,
        marginBottom: 16
    },
    smallAvatar: {
        width: 50,
        height: 50
    },
    moneyAmountLabel: {
        marginRight: 20
    }
};

class ScheduledPaymentItem extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    openInfo = event => this.setState({ open: !this.state.open });

    render() {
        const { scheduledPayment, BunqJSClient, key, t } = this.props;

        const scheduledPaymentInfo = scheduledPayment.ScheduledPayment;
        const schedule = scheduledPaymentInfo.schedule;

        if (scheduledPaymentInfo.status !== "ACTIVE") {
            return null;
        }

        const scheduleTextResult = scheduleTexts(
            t,
            schedule.time_start,
            schedule.time_end,
            schedule.recurrence_size,
            schedule.recurrence_unit
        );

        const formattedPaymentAmount = formatMoney(
            scheduledPaymentInfo.payment.amount.value
        );

        let imageUUID = false;
        if (scheduledPaymentInfo.payment.counterparty_alias.avatar) {
            imageUUID =
                scheduledPaymentInfo.payment.counterparty_alias.avatar.image[0]
                    .attachment_public_uuid;
        }

        const nextPaymentText = scheduledPaymentInfo.schedule.time_next
            ? `Next payment: ${humanReadableDate(
                  scheduledPaymentInfo.schedule.time_next
              )}`
            : "Schedule expired";

        return (
            <React.Fragment>
                <ListItem key={key}>
                    <Avatar style={styles.smallAvatar}>
                        <LazyAttachmentImage
                            width={50}
                            BunqJSClient={BunqJSClient}
                            imageUUID={imageUUID}
                        />
                    </Avatar>

                    <ListItemText
                        primary={scheduleTextResult.primary}
                        secondary={scheduleTextResult.secondary}
                    />

                    <ListItemSecondaryAction>
                        <MoneyAmountLabel
                            style={styles.moneyAmountLabel}
                            info={scheduledPaymentInfo.payment}
                            type="payment"
                        >
                            {formattedPaymentAmount}
                        </MoneyAmountLabel>
                    </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                    <ListItemText inset primary={nextPaymentText} />

                    <ListItemSecondaryAction>
                        <IconButton
                            disabled={this.props.deleteLoading}
                            onClick={this.props.deleteScheduledPayment(
                                scheduledPaymentInfo
                            )}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
                <Divider />
            </React.Fragment>
        );
    }
}

export default ScheduledPaymentItem;
