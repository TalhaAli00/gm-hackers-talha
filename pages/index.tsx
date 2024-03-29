"use client";
import type { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  CloseButton,
  Code,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Switch,
  Text,
  Tooltip,
  VStack,
  useColorMode,
  useToast,
} from "@chakra-ui/react";
import {
  useInitWeb3InboxClient,
  useManageSubscription,
  useMessages,
  useSubscription,
  useSubscriptionScopes,
  useW3iAccount,
} from "@web3inbox/widget-react";
import "@web3inbox/widget-react/dist/compiled.css";

import { useAccount, usePublicClient, useSignMessage } from "wagmi";
import { FaBell, FaBellSlash } from "react-icons/fa";
import { BsPersonFillCheck, BsSendFill } from "react-icons/bs";
import { BiSave } from "react-icons/bi";
import useSendNotification from "../utils/useSendNotification";
import Link from "next/link";
import { useInterval } from "usehooks-ts";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID as string;

const Home: NextPage = () => {
  const { address } = useAccount({
    onDisconnect: () => {
      localStorage.removeItem("wc@2:client:0.3//session");
      window.location.reload();
    },
  });

  // Web3Inbox SDK hooks
  const isW3iInitialized = useInitWeb3InboxClient({
    projectId,
    // Replace with your deployment hostname (eg: my-hack-project.vercel.app)
    domain: "hackers.gm.walletconnect.com",
  });
  const {
    account,
    setAccount,
    register: registerIdentity,
    identityKey,
  } = useW3iAccount();
  const {
    subscribe,
    unsubscribe,
    isSubscribed,
    isSubscribing,
    isUnsubscribing,
  } = useManageSubscription(account);
  const { subscription } = useSubscription(account);
  const { messages, deleteMessage } = useMessages(account);
  const { scopes, updateScopes } = useSubscriptionScopes(account);

  const { handleSendNotification, isSending } = useSendNotification();

  const { signMessageAsync } = useSignMessage();
  const wagmiPublicClient = usePublicClient();
  const { colorMode } = useColorMode();

  const toast = useToast();
  const [lastBlock, setLastBlock] = useState<string>();

  const { register, setValue, handleSubmit } = useForm();

  const signMessage = useCallback(
    async (message: string) => {
      const res = await signMessageAsync({
        message,
      });

      return res as string;
    },
    [signMessageAsync]
  );
  const onSubmit = handleSubmit(async (formData) => {
    const enabledScopes = Object.entries(formData)
      .filter(([key, isEnabled]) => isEnabled)
      .map(([key]) => key);
    try {
      await updateScopes(enabledScopes);
      toast({
        title: "Preferences updated",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Failed to update preferences",
        status: "error",
      });
    }
  });
  const handleTestNotification = useCallback(async () => {
    if (isSubscribed) {
      handleSendNotification({
        title: "GM Hacker",
        body: "Hack it until you make it!",
        icon: `${window.location.origin}/WalletConnect-blue.svg`,
        url: "https://hackers.gm.walletconnect.com/",
        type: "promotional",
      });
    }
  }, [handleSendNotification, isSubscribed]);

  const handleRegistration = useCallback(async () => {
    if (!account) return;
    try {
      const identity = await registerIdentity(signMessage);
      console.log({ identity });
    } catch (error) {
      console.log(error);
    }
  }, [signMessage, registerIdentity, account]);

  const handleSubscribe = useCallback(async () => {
    if (!identityKey) {
      await handleRegistration();
    }
    await subscribe();
  }, [identityKey, handleRegistration, subscribe]);

  const handleUnsubscribe = useCallback(async () => {
    if (!identityKey) {
      await handleRegistration();
    }
    await unsubscribe();
  }, [identityKey, handleRegistration, unsubscribe]);

  useEffect(() => {
    if (!Boolean(address)) return;
    setAccount(`eip155:1:${address}`);
  }, [signMessage, address, setAccount]);

  useEffect(() => {
    Object.entries(scopes).forEach(([scopeKey, scope]) => {
      const s: any = scope;
      if (s.enabled) {
        setValue(scopeKey, s.enabled);
      }
    });
  }, [scopes, setValue]);

  const handleBlockNotification = useCallback(async () => {
    if (isSubscribed) {
      const blockNumber = await wagmiPublicClient.getBlockNumber();
      if (lastBlock !== blockNumber.toString()) {
        setLastBlock(blockNumber.toString());
        return handleSendNotification({
          title: "New block",
          body: blockNumber.toString(),
          icon: `${window.location.origin}/eth-glyph-colored.png`,
          url: `https://etherscan.io/block/${blockNumber.toString()}`,
          type: "transactional",
        });
      }
    }
  }, [wagmiPublicClient, handleSendNotification, isSubscribed, lastBlock]);

  useInterval(() => {
    handleBlockNotification();
  }, 12000);

  return (
    <Flex w="full" flexDirection={"column"} maxW="700px">
      <Image
        aria-label="WalletConnect"
        src={
          colorMode === "dark"
            ? "/WalletConnect-white.svg"
            : "/WalletConnect-black.svg"
        }
      />
      <Heading alignSelf={"center"} textAlign={"center"} mb={6}>
        Web3Inbox hooks
      </Heading>

      <Flex flexDirection="column" gap={4}>
        {isSubscribed ? (
          <Flex flexDirection={"column"} alignItems="center" gap={4}>
            <Button
              leftIcon={<BsSendFill />}
              variant="outline"
              onClick={handleTestNotification}
              isDisabled={!isW3iInitialized}
              colorScheme="blue"
              rounded="full"
              isLoading={isSending}
              loadingText="Sending..."
            >
              Send test notification
            </Button>
            <Button
              leftIcon={<FaBellSlash />}
              onClick={handleUnsubscribe}
              variant="outline"
              isDisabled={!isW3iInitialized || !account}
              colorScheme="red"
              isLoading={isUnsubscribing}
              loadingText="Unsubscribing..."
              rounded="full"
            >
              Unsubscribe
            </Button>
          </Flex>
        ) : !account ? (
          <Flex flexDirection={"column"} alignItems="center" gap={4}>
            <Tooltip
              label={
                !Boolean(address)
                  ? "Connect your wallet first."
                  : "Register your account."
              }
              hasArrow
              rounded="lg"
              hidden={Boolean(identityKey)}
            >
              <Button
                leftIcon={<BsPersonFillCheck />}
                variant="outline"
                onClick={handleRegistration}
                isDisabled={!Boolean(address)}
                rounded="full"
                w="fit-content"
              >
                Register
              </Button>
            </Tooltip>
          </Flex>
        ) : (
          <Button
            leftIcon={<FaBell />}
            onClick={handleSubscribe}
            colorScheme="cyan"
            rounded="full"
            variant="outline"
            w="fit-content"
            alignSelf="center"
            isLoading={isSubscribing}
            loadingText="Subscribing..."
            isDisabled={!Boolean(account)}
          >
            Subscribe
          </Button>
        )}

        {isSubscribed && (
          <Accordion defaultIndex={[1]} allowToggle mt={10}>
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Heading fontSize="md" as="span" flex="1" textAlign="left">
                    Subscription
                  </Heading>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <Code
                  lang="json"
                  maxW={{
                    base: "280px",
                    sm: "lg",
                    md: "full",
                  }}
                >
                  <pre
                    style={{
                      overflow: "scroll",
                    }}
                  >
                    {JSON.stringify(subscription, undefined, 2)}
                  </pre>
                </Code>
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem>
              <AccordionButton>
                <Heading fontSize="md" as="span" flex="1" textAlign="left">
                  Last Messages
                </Heading>
                <AccordionIcon />
              </AccordionButton>
              <Box overflowY="scroll" position={"relative"} maxH="400px">
                <AccordionPanel
                  display="flex"
                  flexDirection={"column"}
                  pb={4}
                  gap={2}
                  position={"relative"}
                >
                  {!messages?.length ? (
                    <Text>No messages yet.</Text>
                  ) : (
                    messages
                      .sort((a, b) => b.id - a.id)
                      .map(({ id, message }) => (
                        <Alert
                          as={Link}
                          href={message.url}
                          target="_blank"
                          key={id}
                          status="info"
                          rounded="xl"
                        >
                          <AlertIcon />

                          <Flex flexDir={"column"} flexGrow={1}>
                            <AlertTitle>{message.title}</AlertTitle>
                            <AlertDescription flexGrow={1}>
                              {message.body}
                            </AlertDescription>
                          </Flex>
                          <Flex w="60px" justifyContent="center">
                            <Image
                              src={message.icon}
                              alt="notification image"
                              height="60px"
                              rounded="full"
                              alignSelf="center"
                            />
                          </Flex>
                          <CloseButton
                            alignSelf="flex-start"
                            position="relative"
                            right={-1}
                            top={-1}
                            onClick={async (e) => {
                              e.preventDefault();
                              deleteMessage(id);
                            }}
                          />
                        </Alert>
                      ))
                  )}
                </AccordionPanel>
              </Box>
            </AccordionItem>

            <AccordionItem>
              <AccordionButton>
                <Heading as="span" fontSize="md" flex="1" textAlign="left">
                  Preferences
                </Heading>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4} display="flex" flexDir="column">
                <VStack as="form" onSubmit={onSubmit}>
                  {Object.entries(scopes)?.map(([scopeKey, scope]) => {
                    return (
                      <FormControl
                        key={scopeKey}
                        display="flex"
                        justifyContent="space-between"
                        gap={4}
                      >
                        <FormLabel htmlFor={scopeKey}>{scopeKey}</FormLabel>
                        <Switch
                          id={scopeKey}
                          defaultChecked={(scope as any).enabled}
                          {...register(scopeKey)}
                        />
                      </FormControl>
                    );
                  })}
                  <Button
                    leftIcon={<BiSave />}
                    alignSelf="flex-end"
                    variant="outline"
                    colorScheme="blue"
                    type="submit"
                    rounded="full"
                  >
                    Save preferences
                  </Button>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </Flex>
    </Flex>
  );
};

export default Home;
