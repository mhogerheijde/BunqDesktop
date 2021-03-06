import * as React from "react";
import Divider from "material-ui/Divider";
import IconButton from "material-ui/IconButton";
import Menu, { MenuItem } from "material-ui/Menu";
import { ListItemIcon, ListItemText } from "material-ui/List";

import { RuleTypes } from "../../Types/Types";

import FileDownloadIcon from "@material-ui/icons/FileDownload";
import AddIcon from "@material-ui/icons/Add";

class NewRuleItemMenu extends React.Component<any, any> {
    state = {
        anchorEl: null
    };

    handleClick = (event: any) => {
        this.setState({ anchorEl: event.currentTarget });
    };

    handleClose = (event: any = null) => {
        this.setState({ anchorEl: null });
    };

    addRule = (ruleType: RuleTypes) => event => {
        this.props.addRule(ruleType);
        this.handleClose();
    };
    openImportDialog = (event: any) => {
        this.props.openImportDialog();
        this.handleClose();
    };

    render() {
        const { anchorEl } = this.state;

        return (
            <div>
                <IconButton
                    aria-label="New rule"
                    aria-owns={anchorEl ? "long-menu" : null}
                    aria-haspopup="true"
                    onClick={this.handleClick}
                >
                    <AddIcon />
                </IconButton>
                <Menu
                    id="long-menu"
                    anchorEl={this.state.anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={this.handleClose}
                >
                    <MenuItem onClick={this.addRule("VALUE")}>
                        Value check
                    </MenuItem>
                    <MenuItem onClick={this.addRule("TRANSACTION_AMOUNT")}>
                        Transaction amount
                    </MenuItem>
                    <MenuItem onClick={this.addRule("ITEM_TYPE")}>
                        Event type
                    </MenuItem>
                    <Divider />

                    <MenuItem onClick={this.openImportDialog}>
                        <ListItemIcon>
                            <FileDownloadIcon />
                        </ListItemIcon>
                        <ListItemText inset primary="Import" />
                    </MenuItem>
                </Menu>
            </div>
        );
    }
}

export default NewRuleItemMenu;
