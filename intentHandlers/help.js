
intent.matches('intent.help', [
  function(session, args) {
    // session.send("I’m Irwin - the IPG Help Desk Assistant! I can help you resolve any issues you are having around Time Management. You can start off by saying “I am having an error” (or) “I have a request”.");
    var msg = new builder.Message(session)
    msg.text(response.help);
    session.send(msg);

    logger.log(session.batch, session.message, true,true, "");
    logger.endDialog();

  }
]);
