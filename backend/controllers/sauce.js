const Sauce = require("../models/Sauce");
const fs = require("fs");

//creation d'une sauce par un utilisateur
exports.createSauce = (req, res) => {
  const sauceObject = JSON.parse(req.body.sauce);
  const sauce = new Sauce({
    ...sauceObject,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersDisliked: [],
  });
  sauce
    .save()
    .then(() => res.status(201).json({ message: "Sauce enregistrée !" }))
    .catch((error) => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      res.status(200).json(sauce);
    })
    .catch((error) => res.status(404).json({ error }));
};

exports.updateSauce = (req, res) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : {
        ...req.body,
      };
  if (
    req.body.likes ||
    req.body.dislikes ||
    req.body.usersLiked ||
    req.body.usersDisliked ||
    req.body.heat > 10 ||
    req.body.heat < 0 ||
    Number.isInteger(req.body.heat) == false
  ) {
    res.status(400).json({ error: "Vous ne pouvez pas changer ces elements" });
  } else {
    Sauce.updateOne(
      { _id: req.params.id },
      { ...sauceObject, _id: req.params.id }
    )
      .then(res.status(200).json({ message: "Sauce modifiée" }))
      .catch((error) => res.status(400).json({ error }));
  }
};

exports.deleteSauce = (req, res) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const fileName = sauce.imageUrl.split("/images/")[1];
      fs.unlink(`images/${fileName}`, () => {
        Sauce.deleteOne({ _id: req.params.id })
          .then(() =>
            res.status(200).json({ message: "La sauce a été supprimée !" })
          )
          .catch((error) => res.status(400).json({ error }));
      });
    })
    .catch((error) => res.status(400).json({ error }));
};

exports.getAllSauce = (req, res) => {
  Sauce.find()
    .then((sauces) => {
      res.status(200).json(sauces);
    })
    .catch((error) => {
      res.status(404).json({ error });
    });
};

//gestion des likes
exports.likeSauce = (req, res) => {
  const userId = req.auth.userId;
  const sauceId = req.params.id;
  const likeState = req.body.like;

  switch (likeState) {
    //si like=1 on incrémente l'attribut likes de la sauce et on ajoute l'id de l'utilisateur dans le tableau usersLiked
    case 1:
      Sauce.findOne({ _id: sauceId })
        .then((sauce) => {
          if (
            sauce.usersLiked.includes(userId) ||
            sauce.usersDisliked.includes(userId)
          ) {
            res.status(400).json({
              error: "Vous ne pouvez pas ajouter de likes ou de dislikes",
            });
          } else {
            Sauce.updateOne(
              { _id: sauceId },
              { $inc: { likes: 1 }, $push: { usersLiked: userId } }
            )
              .then(() =>
                res.status(200).json({ message: "Like ajouté à la sauce" })
              )
              .catch((error) => res.status(400).json({ error }));
          }
        })
        .catch((error) => res.status(400).json({ error }));
      break;
    //si like=0 alors on étudie les deux tableaux usersLiked et usersDisliked et on mets à jour les attributs likes et dislikes ainsi que les tableaux eux meme selon la présence de l'userId dans l'un des deux
    case 0:
      //retourne le tableau correspondant a sauceId
      Sauce.findOne({ _id: sauceId })
        .then((sauce) => {
          if (sauce.usersLiked.includes(userId)) {
            //décrémente l'attribut likes de la sauce et supprime l'userId du tableau usersLiked
            Sauce.updateOne(
              { _id: sauceId },
              { $inc: { likes: -1 }, $pull: { usersLiked: userId } }
            )
              .then(() =>
                res
                  .status(200)
                  .json({ message: "Vous avez enlever votre like !" })
              )
              .catch((error) => res.status(400).json({ error }));
          } else if (sauce.usersDisliked.includes(userId)) {
            //décrémente l'attribut dislikes de la sauce et supprime l'userId du tableau usersDisliked
            Sauce.updateOne(
              { _id: sauceId },
              { $inc: { dislikes: -1 }, $pull: { usersDisliked: userId } }
            )
              .then(() =>
                res
                  .status(200)
                  .json({ message: "Vous avez enlever votre dislike !" })
              )
              .catch((error) => res.status(400).json({ error }));
          }
        })
        .catch((error) => res.status(400).json({ error }));
      break;
    //si like=-1 on incrémente l'attribut dislikes de la sauce et on ajoute l'id de l'utilisateur dans le tableau usersDisliked
    case -1:
      Sauce.findOne({ _id: sauceId }).then((sauce) => {
        if (
          sauce.usersLiked.includes(userId) ||
          sauce.usersDisliked.includes(userId)
        ) {
          res
            .status(400)
            .json({ error: "Vous ne pouvez pas modifier ces éléments" });
        } else {
          Sauce.updateOne(
            { _id: sauceId },
            { $inc: { dislikes: 1 }, $push: { usersDisliked: userId } }
          )
            .then(() =>
              res.status(200).json({ message: "dislike ajouté à la sauce" })
            )
            .catch((error) => res.status(400).json({ error }));
        }
      });
      break;
  }
};
