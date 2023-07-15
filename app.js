
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect('mongodb://127.0.0.1:27017/todolistDB'); // for some reason need to use full IP instead of 'localhost'
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open to ' + 'mongodb://127.0.0.1:27017/todolistDB');
});

// Item

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your to-do list!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

// List

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

// functions

async function insertItems(theseItems) {
  try {
    const inserted = await Item.insertMany(theseItems);
    console.log(inserted);
  } catch (err) {
    console.log(err);
  }
}

async function findItems() { // .find's callback is deprecated so need to use async/await
  try {
    const items = await Item.find({});
    return items;
  } catch (err) {
    console.log(err);
  }
}

app.get("/", function (req, res) {
  findItems().then((foundItems) => {
    if (foundItems.length === 0) {
      insertItems(defaultItems).then(() => {
        res.redirect("/");
      });
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  })
});

// look at this findOne function for the useful (try) .then and .catch chaining to replace callback deprecation
app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName }).then((foundList) => {
    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      list.save();
      res.redirect("/" + customListName)
    } else {
      console.log("Found list: " + foundList.name);
      res.render("list",{ listTitle: foundList.name, newListItems: foundList.items });
    }
  }).catch((err) => {
     console.log(err);
  });
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  })

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}).then((foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", (req, res) => {
  async function deleteItem() {
    const checkedItemId = req.body.checked;
    const listName = req.body.listName;

    if (listName === "Today") {
      Item.findByIdAndDelete({_id: checkedItemId}).then(() => {
        res.redirect("/");
      }).catch((err) => {
        console.log(err);
      });
    } else {
      List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}).then((foundList) => {
        res.redirect("/" + listName);
      }).catch((err) => {
        console.log(err);
      });
    }

  }
  deleteItem();
});

app.get("/work", function (req, res) {
  res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
