import * as React from "react";
import { translate } from "react-i18next";
import Paper from "material-ui/Paper";
import Button from "material-ui/Button";
import Switch from "material-ui/Switch";
import { FormControlLabel } from "material-ui/Form";
import List from "material-ui/List";

import RuleCollection, { EventObjectResult } from "../../Types/RuleCollection";
import RuleCollectionPreviewItem from "./RuleCollectionPreviewItem";

// import typed worker
const RuleCollectionCheckWorker: any = require("../../WebWorkers/rule_collection_check.worker.js");

const styles = {
    toggleVisibilityButton: {
        width: "100%",
        marginBottom: 16
    },
    paper: {
        textAlign: "center"
    }
};

class RuleCollectionPreview extends React.Component<any, any> {
    state = {
        visible: false,
        eventResults: [],
        showAll: false
    };
    worker: any;

    componentWillMount() {
        this.worker = new RuleCollectionCheckWorker();
        this.worker.onmessage = this.handleWorkerEvent;
    }

    componentWillUnmount() {
        this.worker.terminate();
    }

    componentDidUpdate(lastProps, lastState) {
        // if changed, we reload the worker info
        if (
            lastProps.ruleCollectionUpdated !== this.props.ruleCollectionUpdated
        ) {
            if (this.state.visible) {
                this.triggerWorkerEvent(this.props);
            }
        }
    }

    handleWorkerEvent = (eventResults: any) => {
        this.setState({ eventResults: eventResults.data.result });
    };
    handleVisibilityToggle = event => {
        this.setState({ visible: !this.state.visible }, () => {
            // now visible, update worker
            if (this.state.visible === true) {
                this.triggerWorkerEvent(this.props);
            }
        });
    };
    triggerWorkerEvent = props => {
        const ruleCollection: RuleCollection | null = props.ruleCollection;
        this.worker.postMessage({
            ruleCollection: ruleCollection,
            payments: props.payments,
            masterCardActions: props.masterCardActions,
            bunqMeTabs: props.bunqMeTabs,
            requestInquiries: props.requestInquiries,
            requestResponses: props.requestResponses
        });
    };

    render() {
        const t = this.props.t;
        const toggleDisplay = (
            <Button
                variant="raised"
                style={styles.toggleVisibilityButton}
                onClick={this.handleVisibilityToggle}
            >
                {this.state.visible ? t("Hide preview") : t("Show preview")}
            </Button>
        );

        let previewContent = null;
        if (this.state.visible) {
            const ruleCollection: RuleCollection | null = this.props
                .ruleCollection;
            if (ruleCollection !== null) {
                const items: any[] = this.state.eventResults.map(
                    (event: EventObjectResult, index: any) => {
                        if (this.state.showAll || event.matches) {
                            return (
                                <RuleCollectionPreviewItem
                                    event={event}
                                    key={index}
                                />
                            );
                        }
                        return null;
                    }
                );

                previewContent = (
                    <Paper style={styles.paper}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={this.state.showAll}
                                    onChange={() =>
                                        this.setState({
                                            showAll: !this.state.showAll
                                        })}
                                />
                            }
                            label={t(
                                "Show all events, not just the matching ones"
                            )}
                        />
                        <List>{items}</List>
                    </Paper>
                );
            }
        }

        return (
            <React.Fragment>
                {toggleDisplay}

                {previewContent}
            </React.Fragment>
        );
    }
}

export default translate("translations")(RuleCollectionPreview);
