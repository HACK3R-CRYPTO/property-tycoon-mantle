--
-- PostgreSQL database dump
--

\restrict z2C9RSapUZN7TsLhyvc8oZ1pyRaeDyW42V6KE08HxSqVDnGzB6eqp8oNLsqdnFa

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: guild_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guild_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guild_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now(),
    contribution numeric DEFAULT 0 NOT NULL
);


ALTER TABLE public.guild_members OWNER TO postgres;

--
-- Name: guilds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guilds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    total_members integer DEFAULT 1 NOT NULL,
    total_portfolio_value numeric DEFAULT 0 NOT NULL,
    total_yield_earned numeric DEFAULT 0 NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.guilds OWNER TO postgres;

--
-- Name: leaderboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaderboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_portfolio_value numeric DEFAULT 0,
    total_yield_earned numeric DEFAULT 0,
    properties_owned integer DEFAULT 0,
    quests_completed integer DEFAULT 0,
    rank integer,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.leaderboard OWNER TO postgres;

--
-- Name: marketplace_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketplace_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    price bigint NOT NULL,
    is_active boolean DEFAULT true,
    listing_type character varying(20) NOT NULL,
    auction_end_time timestamp without time zone,
    highest_bid bigint,
    highest_bidder_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.marketplace_listings OWNER TO postgres;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_id bigint NOT NULL,
    owner_id uuid NOT NULL,
    property_type character varying(50) NOT NULL,
    value numeric NOT NULL,
    yield_rate integer NOT NULL,
    rwa_contract character varying(42),
    rwa_token_id bigint,
    total_yield_earned bigint DEFAULT 0,
    x integer,
    y integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.properties OWNER TO postgres;

--
-- Name: quest_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quest_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quest_id uuid NOT NULL,
    user_id uuid NOT NULL,
    completed boolean DEFAULT false,
    progress integer DEFAULT 0,
    reward_claimed boolean DEFAULT false,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.quest_progress OWNER TO postgres;

--
-- Name: quests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quest_id bigint NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    reward_amount numeric NOT NULL,
    required_properties integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    required_property_type character varying(50)
);


ALTER TABLE public.quests OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address character varying(42) NOT NULL,
    username character varying(100),
    total_portfolio_value numeric DEFAULT 0,
    total_yield_earned numeric DEFAULT 0,
    properties_owned integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: yield_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.yield_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    amount bigint NOT NULL,
    claimed boolean DEFAULT false,
    transaction_hash character varying(66),
    claimed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.yield_records OWNER TO postgres;

--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, user_id, message, created_at) FROM stdin;
cf1dd3ad-9eca-417e-8e49-efdb8698627b	49a1eae8-0dd9-49d1-9466-1c62e0772742	hi	2025-12-26 23:41:26.311
9b9b2d74-1ebd-40c6-931c-44ef8fd28ab0	e33746f1-43b0-4e59-8366-b2778f90a4ed	holla	2025-12-26 23:49:40.753
2227ed66-a913-4e18-b5a9-5aa1c7ac3c86	e33746f1-43b0-4e59-8366-b2778f90a4ed	holla	2025-12-26 23:49:50.823
8d41ba4b-798b-436f-833b-4ed1642bdad3	49a1eae8-0dd9-49d1-9466-1c62e0772742	gm	2025-12-27 18:32:04.305
af668970-f30d-44ec-a8d7-f6e8c494f22b	49a1eae8-0dd9-49d1-9466-1c62e0772742	gm gm	2025-12-28 19:22:00.627
dfc6df57-3042-4a09-a0b2-00148c4e62ce	e33746f1-43b0-4e59-8366-b2778f90a4ed	holla	2025-12-30 07:51:13.331
\.


--
-- Data for Name: guild_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guild_members (id, guild_id, user_id, role, joined_at, contribution) FROM stdin;
86fbc1da-dd73-4a0f-9f23-773ecc533101	263437ef-c18c-419d-8c27-c6224cb9c928	e33746f1-43b0-4e59-8366-b2778f90a4ed	member	2025-12-28 21:25:35.037903	0
1e37fd46-d3b8-47e8-909c-039bd78af00b	263437ef-c18c-419d-8c27-c6224cb9c928	49a1eae8-0dd9-49d1-9466-1c62e0772742	member	2025-12-29 08:31:17.373364	0
\.


--
-- Data for Name: guilds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guilds (id, name, description, owner_id, total_members, total_portfolio_value, total_yield_earned, is_public, created_at, updated_at) FROM stdin;
263437ef-c18c-419d-8c27-c6224cb9c928	tycoon	que sera sera	49a1eae8-0dd9-49d1-9466-1c62e0772742	2	200000000000000000000	0	t	2025-12-28 21:01:40.477269	2025-12-30 07:46:47.281
\.


--
-- Data for Name: leaderboard; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leaderboard (id, user_id, total_portfolio_value, total_yield_earned, properties_owned, quests_completed, rank, updated_at) FROM stdin;
9935c666-0f9f-4594-8443-06f8de5dfcdf	e33746f1-43b0-4e59-8366-b2778f90a4ed	100000000000000000000	0	1	0	\N	2025-12-30 07:46:43.263
765478a1-39c5-4b1c-8e47-b43dbee0d07e	49a1eae8-0dd9-49d1-9466-1c62e0772742	100000000000000000000	0	1	1	\N	2025-12-30 07:56:11.945
\.


--
-- Data for Name: marketplace_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marketplace_listings (id, property_id, seller_id, price, is_active, listing_type, auction_end_time, highest_bid, highest_bidder_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.properties (id, token_id, owner_id, property_type, value, yield_rate, rwa_contract, rwa_token_id, total_yield_earned, x, y, is_active, created_at, updated_at) FROM stdin;
817e253c-52ad-4e03-b3e9-ee601013e6b8	0	49a1eae8-0dd9-49d1-9466-1c62e0772742	Residential	100000000000000000000	500	0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45	1	0	0	0	t	2025-12-30 07:35:47	2025-12-30 13:24:11.264
153659ba-8716-42de-9880-bca6a35c91b7	1	e33746f1-43b0-4e59-8366-b2778f90a4ed	Residential	100000000000000000000	500	0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45	5	0	0	0	t	2025-12-30 07:46:35	2025-12-30 16:01:02.966
\.


--
-- Data for Name: quest_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quest_progress (id, quest_id, user_id, completed, progress, reward_claimed, completed_at, created_at, updated_at) FROM stdin;
8cd0c5e4-25be-4444-95c2-b88a2c4fcc61	5921428c-3473-4ca8-ade2-e78e1a49ac4b	e33746f1-43b0-4e59-8366-b2778f90a4ed	f	0	f	\N	2025-12-30 16:40:46.37	2025-12-30 16:40:55.197
24519ed6-9a81-4ce7-816b-e7af67202f89	ef020b4f-f022-411b-8607-9a20a66546a4	e33746f1-43b0-4e59-8366-b2778f90a4ed	f	0	f	\N	2025-12-30 16:40:46.926	2025-12-30 16:40:55.806
3938eacd-c8ba-493a-8d8a-8feed58ec2b7	a2963925-3c12-4832-9c67-a804e724a91e	e33746f1-43b0-4e59-8366-b2778f90a4ed	f	0	f	\N	2025-12-30 16:40:47.441	2025-12-30 16:40:56.338
0949a46f-eb9a-482f-bf7d-628e800cbd8e	6a3f0745-d342-4a95-97ed-49693d0e24d4	e33746f1-43b0-4e59-8366-b2778f90a4ed	f	0	f	\N	2025-12-30 16:40:47.963	2025-12-30 16:40:56.838
f2a6b79d-fcbb-4120-9395-6c9ce70481df	33a10090-1455-49f7-8493-1fb62b430c44	e33746f1-43b0-4e59-8366-b2778f90a4ed	f	0	f	\N	2025-12-30 16:40:48.48	2025-12-30 16:40:57.358
6e962cf0-9ce8-4c6d-a34b-2d3c1553ed86	ef020b4f-f022-411b-8607-9a20a66546a4	49a1eae8-0dd9-49d1-9466-1c62e0772742	f	0	f	\N	2025-12-30 07:32:47.205	2025-12-30 07:42:01.537
077da8bc-a3f5-4bd3-bedc-ed477862f6ef	a2963925-3c12-4832-9c67-a804e724a91e	49a1eae8-0dd9-49d1-9466-1c62e0772742	f	0	f	\N	2025-12-30 07:32:48.342	2025-12-30 07:42:02.079
d4edcf5d-2bd9-40ed-93de-bc9d496e369c	6a3f0745-d342-4a95-97ed-49693d0e24d4	49a1eae8-0dd9-49d1-9466-1c62e0772742	f	0	f	\N	2025-12-30 07:32:48.967	2025-12-30 07:42:02.607
b0aa37f0-54a7-4fbe-937f-27b175776591	33a10090-1455-49f7-8493-1fb62b430c44	49a1eae8-0dd9-49d1-9466-1c62e0772742	f	0	f	\N	2025-12-30 07:32:50.127	2025-12-30 07:42:03.122
2fb28ea4-a5d5-43a7-aabf-8bbca5237ff6	5921428c-3473-4ca8-ade2-e78e1a49ac4b	49a1eae8-0dd9-49d1-9466-1c62e0772742	t	100	t	2025-12-30 07:56:06.575	2025-12-30 07:32:46.028	2025-12-30 07:56:06.575
\.


--
-- Data for Name: quests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quests (id, quest_id, name, description, reward_amount, required_properties, active, created_at, updated_at, required_property_type) FROM stdin;
5921428c-3473-4ca8-ade2-e78e1a49ac4b	0	First Property	Mint your first property	100000000000000000000	1	t	2025-12-30 07:25:40.562412	2025-12-30 07:25:40.562412	\N
ef020b4f-f022-411b-8607-9a20a66546a4	1	Diversify Portfolio	Own 3 different property types	500000000000000000000	0	t	2025-12-30 07:25:41.178355	2025-12-30 07:25:41.178355	\N
a2963925-3c12-4832-9c67-a804e724a91e	2	Yield Master	Collect yield 7 days in a row	1000000000000000000000	0	t	2025-12-30 07:25:42.242005	2025-12-30 07:25:42.242005	\N
6a3f0745-d342-4a95-97ed-49693d0e24d4	3	Property Mogul	Own 10 properties	2000000000000000000000	10	t	2025-12-30 07:25:43.285483	2025-12-30 07:25:43.285483	\N
33a10090-1455-49f7-8493-1fb62b430c44	4	RWA Pioneer	Link 5 properties to RWA	1500000000000000000000	0	t	2025-12-30 07:25:44.340852	2025-12-30 07:25:44.340852	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, wallet_address, username, total_portfolio_value, total_yield_earned, properties_owned, created_at, updated_at) FROM stdin;
ee046f2a-88e4-4173-bcf3-e0889986bba1	0x6389d7168029715de118baf51b6d32ee1ebea46b	\N	0	0	0	2025-12-27 18:47:52.781	2025-12-27 18:47:52.781
e33746f1-43b0-4e59-8366-b2778f90a4ed	0x3210607ac8126770e850957ce7373ee7e59e3a29	exodus	0	0	0	2025-12-26 23:49:40.726	2025-12-30 08:22:35.2
49a1eae8-0dd9-49d1-9466-1c62e0772742	0xd2df53d9791e98db221842dd085f4144014bbe2a	ogazboiz	0	0	0	2025-12-26 23:41:26.27	2025-12-30 13:48:33.349
11e091a6-df6a-444a-85c9-44069223e626	0xcba548de848bae1968583b2502f44c46539453a8	\N	0	0	0	2025-12-30 14:01:21.863	2025-12-30 14:01:21.863
dbd1ea77-46e8-41fa-828d-7705ecfe16d3	0x63ab0ca2bda77a4432c2a13285bfd1f7258646e1	\N	0	0	0	2025-12-30 14:01:53.375	2025-12-30 14:01:53.375
\.


--
-- Data for Name: yield_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.yield_records (id, property_id, owner_id, amount, claimed, transaction_hash, claimed_at, created_at) FROM stdin;
\.


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: guild_members guild_members_guild_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_guild_id_user_id_key UNIQUE (guild_id, user_id);


--
-- Name: guild_members guild_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_pkey PRIMARY KEY (id);


--
-- Name: guilds guilds_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_name_key UNIQUE (name);


--
-- Name: guilds guilds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_pkey PRIMARY KEY (id);


--
-- Name: leaderboard leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (id);


--
-- Name: leaderboard leaderboard_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_user_id_key UNIQUE (user_id);


--
-- Name: marketplace_listings marketplace_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: properties properties_token_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_token_id_key UNIQUE (token_id);


--
-- Name: quest_progress quest_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_pkey PRIMARY KEY (id);


--
-- Name: quest_progress quest_progress_quest_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_quest_id_user_id_key UNIQUE (quest_id, user_id);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: quests quests_quest_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_quest_id_key UNIQUE (quest_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_wallet_address_key UNIQUE (wallet_address);


--
-- Name: yield_records yield_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yield_records
    ADD CONSTRAINT yield_records_pkey PRIMARY KEY (id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages USING btree (user_id);


--
-- Name: idx_guild_members_guild_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guild_members_guild_id ON public.guild_members USING btree (guild_id);


--
-- Name: idx_guild_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guild_members_user_id ON public.guild_members USING btree (user_id);


--
-- Name: idx_guilds_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guilds_owner_id ON public.guilds USING btree (owner_id);


--
-- Name: idx_marketplace_listings_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_listings_property_id ON public.marketplace_listings USING btree (property_id);


--
-- Name: idx_marketplace_listings_seller_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketplace_listings_seller_id ON public.marketplace_listings USING btree (seller_id);


--
-- Name: idx_properties_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_owner_id ON public.properties USING btree (owner_id);


--
-- Name: idx_properties_token_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_token_id ON public.properties USING btree (token_id);


--
-- Name: idx_quest_progress_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quest_progress_user_id ON public.quest_progress USING btree (user_id);


--
-- Name: idx_users_wallet_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_wallet_address ON public.users USING btree (wallet_address);


--
-- Name: idx_yield_records_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_yield_records_owner_id ON public.yield_records USING btree (owner_id);


--
-- Name: idx_yield_records_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_yield_records_property_id ON public.yield_records USING btree (property_id);


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: guild_members guild_members_guild_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE CASCADE;


--
-- Name: guild_members guild_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: guilds guilds_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leaderboard leaderboard_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: marketplace_listings marketplace_listings_highest_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_highest_bidder_id_fkey FOREIGN KEY (highest_bidder_id) REFERENCES public.users(id);


--
-- Name: marketplace_listings marketplace_listings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: marketplace_listings marketplace_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: properties properties_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quest_progress quest_progress_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;


--
-- Name: quest_progress quest_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quest_progress
    ADD CONSTRAINT quest_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: yield_records yield_records_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yield_records
    ADD CONSTRAINT yield_records_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: yield_records yield_records_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yield_records
    ADD CONSTRAINT yield_records_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict z2C9RSapUZN7TsLhyvc8oZ1pyRaeDyW42V6KE08HxSqVDnGzB6eqp8oNLsqdnFa

