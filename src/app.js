const express = require("express")
const { v4: uuidv4 } = require('uuid')

const { CommunicationIdentityClient } = require('@azure/communication-identity');

const {usersRepository } = require('./user-repository')

const connectionString = process.env['COMMUNICATION_SERVICES_CONNECTION_STRING'];
const acsEndpoint = process.env['COMMUNICATION_SERVICES_ENDPOINT'];

const identityClient = new CommunicationIdentityClient(connectionString);

const app = express();
app.use(express.json());  


app.get("/acs_info", (req, res) => {
    res.json({"endpoint": acsEndpoint});
});

app.get("/users", (req, res) => {
    res.json(usersRepository);
});

app.post("/users", async (req, res) => {
    let { name } = { ...req.body }
    let user = {
        id: uuidv4(),
        name: name,
    }
    user.communicationIdentity = await getCommunicationIdentity(user)
    usersRepository.push(user)
    res.json(user);
});


app.get("/users/:id/token/call", async (req, res) => {
    return res.json(await getUserWithToken(req.params.id, ["voip"]))
});

app.get("/users/:id/token/chat", async (req, res) => {
    return res.json(await getUserWithToken(req.params.id, ["chat"]))
});

app.get("/users/:id/token/call-with-chat", async (req, res) => {
    return res.json(await getUserWithToken(req.params.id, ["voip", "chat"]))
});




async function getUserWithToken(userId, services) {
    let user = usersRepository.find(user => user.id === userId)

    let communicationIdentity = await getCommunicationIdentity(user)
    let token = await getToken(communicationIdentity, services)
    
    return { ...user, token }
}

async function getCommunicationIdentity(user) {
    if (!user.communicationIdentity) {
        user.communicationIdentity = await identityClient.createUser();
    }
    return user.communicationIdentity
}

async function getToken(communicationIdentity, services) {
    let tokenResponse = await identityClient.getToken(communicationIdentity, services);
    const { token, expiresOn } = tokenResponse;
    return token
}

function ensureAllUsersHaveCommunicationIdentity() {
    Promise.all(usersRepository.map(async (user) => {
        await getCommunicationIdentity(user)
      }))
}

ensureAllUsersHaveCommunicationIdentity()


module.exports = app;