import React from "react";
import { connect } from "react-redux";
import Icon from "material-ui/Icon";
import IconButton from "material-ui/IconButton";
import {
    ListItem,
    ListItemIcon,
    ListSubheader,
    ListItemSecondaryAction
} from "material-ui/List";
import Menu, { MenuItem } from "material-ui/Menu";

import AddIcon from "@material-ui/icons/Add";

import CategoryIcon from "../Categories/CategoryIcon";
import CategoryChip from "../Categories/CategoryChip";

import {
    addCategoryIdFilter,
    removeCategoryIdFilter
} from "../../Actions/filters";

const styles = {
    listItem: {
        display: "flex",
        flexWrap: "wrap",
        padding: "0 0 0 8px"
    },
    subheaderTitle: {
        height: 40
    }
};

class CategorySelection extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            anchorEl: null
        };
    }

    handleClick = event => {
        this.setState({ anchorEl: event.currentTarget });
    };
    handleClose = event => {
        this.setState({ anchorEl: null });
    };

    addCategory = categoryId => event => {
        this.props.addCategoryId(categoryId);
    };
    removeCategory = index => event => {
        this.props.removeCategoryId(index);
    };

    render() {
        const { anchorEl } = this.state;
        const { categories, selectedCategories } = this.props;

        // limit size if a lot of categories are selected
        const bigChips = selectedCategories.length <= 8;

        const categoryItems = selectedCategories.map((categoryId, key) => {
            const category = categories[categoryId];

            // ensure category exists
            if (!category) return null;

            // display big chip or smaller icon
            return bigChips ? (
                <CategoryChip
                    key={key}
                    category={category}
                    onDelete={this.removeCategory(key)}
                />
            ) : (
                <IconButton>
                    <CategoryIcon key={key} category={category} />
                </IconButton>
            );
        });

        const categoryMenuItems = Object.keys(
            categories
        ).map((categoryId, key) => {
            const category = categories[categoryId];

            // don't display already selected items
            if (selectedCategories.includes(categoryId)) {
                return null;
            }

            return (
                <MenuItem key={key} onClick={this.addCategory(categoryId)}>
                    <ListItemIcon>
                        <Icon
                            style={{
                                height: 24,
                                width: 24,
                                color: category.color
                            }}
                        >
                            {category.icon}
                        </Icon>
                    </ListItemIcon>
                    {category.label}
                </MenuItem>
            );
        });

        return (
            <React.Fragment>
                <ListSubheader style={styles.subheaderTitle}>
                    {t("Category filter")}

                    <ListItemSecondaryAction>
                        <IconButton
                            aria-haspopup="true"
                            onClick={this.handleClick}
                        >
                            <AddIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                    <Menu
                        anchorEl={this.state.anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={this.handleClose}
                    >
                        {categoryMenuItems}
                    </Menu>
                </ListSubheader>
                <ListItem style={styles.listItem}>{categoryItems}</ListItem>
            </React.Fragment>
        );
    }
}

const mapStateToProps = state => {
    return {
        categories: state.categories.categories,

        selectedCategories: state.category_filter.selected_categories
    };
};

const mapDispatchToProps = dispatch => {
    return {
        addCategoryId: categoryId => dispatch(addCategoryIdFilter(categoryId)),
        removeCategoryId: index => dispatch(removeCategoryIdFilter(index))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(CategorySelection);
