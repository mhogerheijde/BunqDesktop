import React from "react";
import iban from "iban";
import { translate } from "react-i18next";
import { connect } from "react-redux";
import Helmet from "react-helmet";
import EmailValidator from "email-validator";
import DateTimePicker from "material-ui-pickers/DateTimePicker/index.js";
import DateFnsUtils from "material-ui-pickers/utils/date-fns-utils";
import MuiPickersUtilsProvider from "material-ui-pickers/utils/MuiPickersUtilsProvider";

import format from "date-fns/format";
import enLocale from "date-fns/locale/en-US";
import deLocale from "date-fns/locale/de";
import nlLocale from "date-fns/locale/nl";

import Select from "material-ui/Select";
import Grid from "material-ui/Grid";
import Input from "material-ui/Input";
import Button from "material-ui/Button";
import Paper from "material-ui/Paper";
import Switch from "material-ui/Switch";
import Divider from "material-ui/Divider";
import TextField from "material-ui/TextField";
import { InputLabel } from "material-ui/Input";
import Typography from "material-ui/Typography";
import Collapse from "material-ui/transitions/Collapse";
import List, { ListItem, ListItemText } from "material-ui/List";
import { FormControl, FormControlLabel } from "material-ui/Form";
import Dialog, {
    DialogActions,
    DialogContent,
    DialogTitle
} from "material-ui/Dialog";

import TranslateMenuItem from "../Components/TranslationHelpers/MenuItem";
import AccountSelectorDialog from "../Components/FormFields/AccountSelectorDialog";
import MoneyFormatInput from "../Components/FormFields/MoneyFormatInput";
import TargetSelection from "../Components/FormFields/TargetSelection";

import { openSnackbar } from "../Actions/snackbar";
import { paySchedule, paySend } from "../Actions/pay";
import { humanReadableDate } from "../Helpers/Utils";
import scheduleTexts from "../Helpers/ScheduleTexts";

const styles = {
    payButton: {
        width: "100%",
        marginTop: 10
    },
    formControl: {
        width: "100%"
    },
    formControlAlt: {
        marginBottom: 10
    },
    paper: {
        padding: 24,
        textAlign: "left"
    },
    textField: {
        width: "100%"
    }
};

class Pay extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            confirmModalOpen: false,

            // if true, a draft-payment will be sent instead of a default payment
            sendDraftPayment: false,

            // if true the schedule payment form is shown
            schedulePayment: false,
            scheduleStartDate: new Date(),
            scheduleEndDate: null,
            recurrenceSize: 1,
            recurrenceUnit: "ONCE",

            // when false, don't allow payment request
            validForm: false,

            // source wallet has insuffient funds
            insufficientFundsCondition: false,

            // the "from" account selection picker
            selectedAccount: 0,

            // amount input field
            amountError: false,
            amount: "",

            // description input field
            descriptionError: false,
            description: "",

            // target field input field
            targetError: false,
            target: "",

            // a list of all the targets
            targets: [],

            // name field for IBAN targets
            ibanNameError: false,
            ibanName: "",

            // targeted account for transfers
            selectedTargetAccount: 1,
            selectedTargetAccountError: false,

            // defines which type is used
            targetType: "EMAIL"
        };
    }

    componentDidMount() {
        // set the current account selected on the dashboard as the active one
        this.props.accounts.map((account, accountKey) => {
            if (this.props.selectedAccount === account.id) {
                this.setState({ selectedAccount: accountKey });
            }
        });
    }

    closeModal = () => {
        this.setState({ confirmModalOpen: false });
    };
    openModal = () => {
        this.setState({ confirmModalOpen: true });
    };

    // callbacks for input fields and selectors
    setTargetType = type => event => {
        this.setState(
            {
                targetType: type,
                target: ""
            },
            () => {
                this.setState({
                    amountError: false,
                    insufficientFundsCondition: false,
                    descriptionError: false,
                    ibanNameError: false,
                    targetError: false,
                    validForm: false
                });
            }
        );
    };
    handleChange = name => event => {
        this.setState(
            {
                [name]: event.target.value
            },
            () => {
                this.validateForm();
                this.validateTargetInput();
            }
        );
    };
    handleChangeFormatted = valueObject => {
        this.setState(
            {
                amount:
                    valueObject.formattedValue.length > 0
                        ? valueObject.floatValue
                        : ""
            },
            () => {
                this.validateForm();
                this.validateTargetInput();
            }
        );
    };
    handleChangeDirect = name => value => {
        this.setState(
            {
                [name]: value
            },
            () => {
                this.validateForm();
                this.validateTargetInput();
            }
        );
    };

    schedulePaymentChange = () => {
        const schedulePayment = !this.state.schedulePayment;

        this.setState({
            schedulePayment: schedulePayment
        });
        if (schedulePayment)
            this.setState({
                sendDraftPayment: false
            });
    };
    draftChange = () => {
        const sendDraftPayment = !this.state.sendDraftPayment;

        this.setState({
            sendDraftPayment: sendDraftPayment
        });
        if (sendDraftPayment)
            this.setState({
                schedulePayment: false
            });
    };

    // remove a key from the target list
    removeTarget = key => {
        const newTargets = [...this.state.targets];
        if (newTargets[key]) {
            newTargets.splice(key, 1);
            this.setState(
                {
                    targets: newTargets
                },
                () => {
                    this.validateForm();
                    this.validateTargetInput();
                }
            );
        }
    };

    // add a target from the current text inputs to the target list
    addTarget = () => {
        const duplicateTarget = this.props.t(
            "This target seems to be added already"
        );
        this.validateTargetInput(valid => {
            // target is valid, add it to the list
            if (valid) {
                const currentTargets = [...this.state.targets];

                let foundDuplicate = false;
                const targetValue =
                    this.state.targetType === "TRANSFER"
                        ? this.state.selectedTargetAccount
                        : this.state.target.trim();

                // check for duplicates in existing target list
                currentTargets.map(newTarget => {
                    if (newTarget.type === this.state.targetType) {
                        if (newTarget.value === targetValue) {
                            foundDuplicate = true;
                        }
                    }
                });

                if (!foundDuplicate) {
                    currentTargets.push({
                        type: this.state.targetType,
                        value: targetValue,
                        name: this.state.ibanName
                    });
                } else {
                    this.props.openSnackbar(duplicateTarget);
                }

                this.setState(
                    {
                        // set the new target list
                        targets: currentTargets,
                        // reset the inputs
                        target: "",
                        ibanName: ""
                    },
                    () => {
                        this.validateForm();
                        this.validateTargetInput();
                    }
                );
            }
        });
    };

    // validate only the taret inputs
    validateTargetInput = (callback = () => {}) => {
        const {
            target,
            ibanName,
            selectedAccount,
            selectedTargetAccount,
            targetType
        } = this.state;

        const ibanNameErrorCondition =
            ibanName.length < 1 || ibanName.length > 64;

        // check if the target is valid based onthe targetType
        let targetErrorCondition = false;
        switch (targetType) {
            case "EMAIL":
                targetErrorCondition = !EmailValidator.validate(target);
                break;
            case "PHONE":
                targetErrorCondition = target.length < 5 || target.length > 64;
                break;
            case "TRANSFER":
                targetErrorCondition =
                    selectedAccount === selectedTargetAccount;
                break;
            default:
            case "IBAN":
                const filteredTarget = target.replace(/ /g, "");
                targetErrorCondition =
                    iban.isValid(filteredTarget) === false ||
                    ibanNameErrorCondition === true;
                break;
        }

        this.setState(
            {
                targetError: targetErrorCondition,
                ibanNameError: ibanNameErrorCondition
            },
            () => callback(!targetErrorCondition)
        );
    };

    // validates all the possible input combinations
    validateForm = () => {
        const {
            description,
            amount,
            ibanName,
            selectedAccount,
            targets
        } = this.state;

        const account = this.props.accounts[selectedAccount];

        const noTargetsCondition = targets.length < 0;
        const insufficientFundsCondition =
            amount !== "" &&
            amount > (account.balance ? account.balance.value : 0);
        const amountErrorCondition = amount < 0.01 || amount > 10000;
        const descriptionErrorCondition = description.length > 140;
        const ibanNameErrorCondition =
            ibanName.length < 1 || ibanName.length > 64;

        this.setState({
            amountError: amountErrorCondition,
            insufficientFundsCondition: insufficientFundsCondition,
            descriptionError: descriptionErrorCondition,
            ibanNameError: ibanNameErrorCondition,
            validForm:
                !noTargetsCondition &&
                !insufficientFundsCondition &&
                !amountErrorCondition &&
                !descriptionErrorCondition &&
                targets.length > 0
        });
    };

    // send the actual payment
    sendPayment = () => {
        if (
            !this.state.validForm ||
            this.props.payLoading ||
            this.state.targets.length <= 0
        ) {
            return false;
        }
        this.closeModal();

        const { accounts, user } = this.props;
        const {
            sendDraftPayment,
            selectedAccount,
            description,
            amount,
            targets,
            schedulePayment,
            scheduleStartDate,
            scheduleEndDate,
            recurrenceSize,
            recurrenceUnit
        } = this.state;

        // account the payment is made from
        const account = accounts[selectedAccount];
        // our user id
        const userId = user.id;

        const targetInfoList = [];
        targets.map(target => {
            // check if the target is valid based onthe targetType
            let targetInfo = false;
            switch (target.type) {
                case "EMAIL":
                    targetInfo = {
                        type: "EMAIL",
                        value: target.value.trim()
                    };
                    break;
                case "PHONE":
                    targetInfo = {
                        type: "PHONE_NUMBER",
                        value: target.value.trim()
                    };
                    break;
                case "TRANSFER":
                    const otherAccount = accounts[target.value];

                    otherAccount.alias.map(alias => {
                        if (alias.type === "IBAN") {
                            targetInfo = {
                                type: "IBAN",
                                value: alias.value.trim(),
                                name: alias.name
                            };
                        }
                    });
                    break;
                case "IBAN":
                    const filteredTarget = target.value.replace(/ /g, "");
                    targetInfo = {
                        type: "IBAN",
                        value: filteredTarget,
                        name: target.name
                    };
                    break;
                default:
                    // invalid type
                    break;
            }

            if (targetInfo !== false) targetInfoList.push(targetInfo);
        });

        const amountInfo = {
            value: amount + "", // sigh, number has to be sent as a string
            currency: "EUR"
        };
        paySchedule;

        if (schedulePayment) {
            const schedule = {
                time_start: format(scheduleStartDate, "YYYY-MM-DD HH:mm:ss"),
                recurrence_unit: recurrenceUnit,
                // on once size has to be 1
                recurrence_size: parseInt(
                    recurrenceUnit !== "ONCE" ? recurrenceSize : 1
                )
            };

            if (scheduleEndDate) {
                schedule.time_end = format(
                    scheduleEndDate,
                    "YYYY-MM-DD HH:mm:ss"
                );
            }

            this.props.paySchedule(
                userId,
                account.id,
                description,
                amountInfo,
                targetInfoList,
                schedule
            );
        } else {
            // regular payment/draft
            this.props.paySend(
                userId,
                account.id,
                description,
                amountInfo,
                targetInfoList,
                sendDraftPayment
            );
        }
    };

    render() {
        const t = this.props.t;
        const {
            selectedTargetAccount,
            selectedAccount,
            description,
            amount,
            targets
        } = this.state;

        let scheduledPaymentText = null;

        if (this.state.schedulePayment) {
            const scheduleTextResult = scheduleTexts(
                t,
                this.state.scheduleStartDate,
                this.state.scheduleEndDate,
                this.state.recurrenceSize,
                this.state.recurrenceUnit
            );

            scheduledPaymentText = (
                <ListItem>
                    <ListItemText
                        primary={scheduleTextResult.primary}
                        secondary={scheduleTextResult.secondary}
                    />
                </ListItem>
            );
        }

        let confirmationModal = null;
        if (this.state.confirmModalOpen) {
            const account = this.props.accounts[selectedAccount];

            // create a list of ListItems with our targets
            const confirmationModelTargets = targets.map(targetItem => {
                let primaryText = "";
                let secondaryText = "";

                switch (targetItem.type) {
                    case "PHONE":
                        primaryText = `${t("Phone")}: ${targetItem.value}`;
                        break;
                    case "EMAIL":
                        primaryText = `${t("Email")}: ${targetItem.value}`;
                        break;
                    case "IBAN":
                        primaryText = `${t("IBAN")}: ${targetItem.value.replace(
                            / /g,
                            ""
                        )}`;
                        secondaryText = `${t("Name")}: ${targetItem.name}`;
                        break;
                    case "TRANSFER":
                        const account = this.props.accounts[
                            selectedTargetAccount
                        ];
                        primaryText = `${t(
                            "Transfer"
                        )}: ${account.description}`;
                        break;
                }

                return [
                    <ListItem>
                        <ListItemText
                            primary={primaryText}
                            secondary={secondaryText}
                        />
                    </ListItem>,
                    <Divider />
                ];
            });

            confirmationModal = (
                <Dialog
                    open={this.state.confirmModalOpen}
                    keepMounted
                    onClose={this.closeModal}
                >
                    <DialogTitle>{t("Confirm the payment")}</DialogTitle>
                    <DialogContent>
                        <List>
                            <ListItem>
                                <ListItemText
                                    primary={t("From")}
                                    secondary={`${account.description} ${account
                                        .balance.value}`}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={t("Description")}
                                    secondary={
                                        description.length <= 0 ? (
                                            "None"
                                        ) : (
                                            description
                                        )
                                    }
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={t("Amount")}
                                    secondary={`${amount.toFixed(2)} ${account
                                        .balance.currency}`}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="Targets: " />
                            </ListItem>
                            <Divider />
                            {confirmationModelTargets}

                            {scheduledPaymentText ? scheduledPaymentText : null}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="raised"
                            onClick={this.closeModal}
                            color="secondary"
                        >
                            {t("Cancel")}
                        </Button>
                        <Button
                            variant="raised"
                            onClick={this.sendPayment}
                            color="primary"
                        >
                            {t("Confirm")}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }

        let localeData;
        switch (this.props.language) {
            case "nl":
                localeData = nlLocale;
                break;
            case "de":
                localeData = deLocale;
                break;
            case "en":
            default:
                localeData = enLocale;
                break;
        }

        const scheduleForm = (
            <Grid item xs={12}>
                <Collapse in={this.state.schedulePayment}>
                    <Grid container spacing={8}>
                        <Grid item xs={6}>
                            <DateTimePicker
                                helperText={t("Start date")}
                                format="MMMM DD, YYYY HH:mm"
                                disablePast
                                style={styles.textField}
                                value={this.state.scheduleStartDate}
                                onChange={this.handleChangeDirect(
                                    "scheduleStartDate"
                                )}
                                ampm={false}
                                cancelLabel={t("Cancel")}
                                clearLabel={t("Clear")}
                                okLabel={t("Ok")}
                                todayLabel={t("Today")}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <DateTimePicker
                                helperText={t("End date")}
                                emptyLabel={t("No end date")}
                                format="MMMM DD, YYYY HH:mm"
                                style={styles.textField}
                                value={this.state.scheduleEndDate}
                                onChange={this.handleChangeDirect(
                                    "scheduleEndDate"
                                )}
                                clearable={true}
                                ampm={false}
                                cancelLabel={t("Cancel")}
                                clearLabel={t("Clear")}
                                okLabel={t("Ok")}
                                todayLabel={t("Today")}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                style={styles.textField}
                                value={this.state.recurrenceSize}
                                disabled={this.state.recurrenceUnit === "ONCE"}
                                onChange={this.handleChange("recurrenceSize")}
                                helperText={"Repeat every"}
                                type={"number"}
                                inputProps={{
                                    min: 0,
                                    step: 1
                                }}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl style={styles.formControl}>
                                <Select
                                    style={styles.textField}
                                    value={this.state.recurrenceUnit}
                                    input={
                                        <Input name="field" id="field-helper" />
                                    }
                                    onChange={this.handleChange(
                                        "recurrenceUnit"
                                    )}
                                >
                                    <TranslateMenuItem value={"ONCE"}>
                                        Once
                                    </TranslateMenuItem>
                                    <TranslateMenuItem value={"HOURLY"}>
                                        Hours
                                    </TranslateMenuItem>
                                    <TranslateMenuItem value={"DAILY"}>
                                        Days
                                    </TranslateMenuItem>
                                    <TranslateMenuItem value={"WEEKLY"}>
                                        Weeks
                                    </TranslateMenuItem>
                                    <TranslateMenuItem value={"MONTHLY"}>
                                        Months
                                    </TranslateMenuItem>
                                    <TranslateMenuItem value={"YEARLY"}>
                                        Years
                                    </TranslateMenuItem>
                                </Select>
                                {/*<FormHelperText htmlFor="age-simple">*/}
                                {/*Repeat every*/}
                                {/*</FormHelperText>*/}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            {scheduledPaymentText}
                        </Grid>
                    </Grid>
                </Collapse>
            </Grid>
        );

        return (
            <Grid container spacing={24} align={"center"} justify={"center"}>
                <Helmet>
                    <title>{`BunqDesktop - Pay`}</title>
                </Helmet>
                <MuiPickersUtilsProvider
                    utils={DateFnsUtils}
                    locale={localeData}
                >
                    <Grid item xs={12} sm={10} md={6} lg={4}>
                        <Paper style={styles.paper}>
                            <Typography variant="headline">
                                {t("New Payment")}
                            </Typography>

                            <AccountSelectorDialog
                                value={this.state.selectedAccount}
                                onChange={this.handleChangeDirect(
                                    "selectedAccount"
                                )}
                                accounts={this.props.accounts}
                                BunqJSClient={this.props.BunqJSClient}
                            />
                            {this.state.insufficientFundsCondition !== false ? (
                                <InputLabel error={true}>
                                    {t(
                                        "Your source account does not have sufficient funds!"
                                    )}
                                </InputLabel>
                            ) : null}

                            <TargetSelection
                                selectedTargetAccount={
                                    this.state.selectedTargetAccount
                                }
                                targetType={this.state.targetType}
                                targets={this.state.targets}
                                target={this.state.target}
                                ibanNameError={this.state.ibanNameError}
                                ibanName={this.state.ibanName}
                                targetError={this.state.targetError}
                                validForm={this.state.validForm}
                                accounts={this.props.accounts}
                                handleChangeDirect={this.handleChangeDirect}
                                handleChange={this.handleChange}
                                setTargetType={this.setTargetType}
                                removeTarget={this.removeTarget}
                                addTarget={this.addTarget}
                            />

                            <TextField
                                fullWidth
                                error={this.state.descriptionError}
                                id="description"
                                label={t("Description")}
                                value={this.state.description}
                                onChange={this.handleChange("description")}
                                margin="normal"
                            />

                            <Grid container justify={"center"}>
                                <Grid item xs={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                color="primary"
                                                checked={
                                                    this.state.sendDraftPayment
                                                }
                                                onChange={this.draftChange}
                                            />
                                        }
                                        label={t("Draft this payment")}
                                    />
                                </Grid>

                                <Grid item xs={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                color="primary"
                                                checked={
                                                    this.state.schedulePayment
                                                }
                                                onChange={
                                                    this.schedulePaymentChange
                                                }
                                            />
                                        }
                                        label={t("Schedule payment")}
                                    />
                                </Grid>

                                {scheduleForm}
                            </Grid>

                            <FormControl
                                style={styles.formControlAlt}
                                error={this.state.amountError}
                                fullWidth
                            >
                                <MoneyFormatInput
                                    id="amount"
                                    value={this.state.amount}
                                    onValueChange={this.handleChangeFormatted}
                                    onKeyPress={ev => {
                                        if (
                                            ev.key === "Enter" &&
                                            this.state.validForm
                                        ) {
                                            this.openModal();
                                            ev.preventDefault();
                                        }
                                    }}
                                />
                            </FormControl>

                            <Button
                                variant="raised"
                                color="primary"
                                disabled={
                                    !this.state.validForm ||
                                    this.props.payLoading
                                }
                                style={styles.payButton}
                                onClick={this.openModal}
                            >
                                {t("Pay")}
                            </Button>
                        </Paper>

                        {confirmationModal}
                    </Grid>
                </MuiPickersUtilsProvider>
            </Grid>
        );
    }
}

const mapStateToProps = state => {
    return {
        payLoading: state.pay.loading,
        accounts: state.accounts.accounts,
        selectedAccount: state.accounts.selectedAccount,
        language: state.options.language,
        user: state.user.user
    };
};

const mapDispatchToProps = (dispatch, props) => {
    const { BunqJSClient } = props;
    return {
        paySend: (
            userId,
            accountId,
            description,
            amount,
            targets,
            draft = false,
            schedule = false
        ) =>
            dispatch(
                paySend(
                    BunqJSClient,
                    userId,
                    accountId,
                    description,
                    amount,
                    targets,
                    draft,
                    schedule
                )
            ),
        paySchedule: (
            userId,
            accountId,
            description,
            amount,
            targets,
            schedule
        ) =>
            dispatch(
                paySchedule(
                    BunqJSClient,
                    userId,
                    accountId,
                    description,
                    amount,
                    targets,
                    schedule
                )
            ),
        openSnackbar: message => dispatch(openSnackbar(message))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(
    translate("translations")(Pay)
);
