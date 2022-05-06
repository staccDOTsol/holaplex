import ReactDom from 'react-dom';

import { HOLAPLEX_MARKETPLACE_SUBDOMAIN } from '@/common/constants/marketplace';
import { getTwitterHandle, useTwitterHandle } from '@/common/hooks/useTwitterHandle';
import { getPFPFromPublicKey } from '@/modules/utils/image';
import { shortenAddress } from '@/modules/utils/string';
import { Popover } from '@headlessui/react';
import { ShareIcon } from '@heroicons/react/outline';
import { Marketplace } from '@holaplex/marketplace-js-sdk';
import { AnchorWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import classNames from 'classnames';
import { DateTime } from 'luxon';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FeedEvent,
  FeedQuery,
  ListingEvent,
  Nft,
  PurchaseEvent,
  useMarketplacePreviewQuery,
  useNftMarketplaceLazyQuery,
  useNftMarketplaceQuery,
  useWalletProfileLazyQuery,
  useWalletProfileQuery,
  Wallet,
} from 'src/graphql/indexerTypes';
import { FollowEvent } from 'src/graphql/indexerTypes.ssr';
import { JsxElement } from 'typescript';
import { Button5 } from '../elements/Button2';
import { FollowUnfollowButton } from '../elements/FollowUnfollowButton';
import Modal from '../elements/Modal';
import MoreDropdown from '../elements/MoreDropdown';
import NFTPreview from '../elements/NFTPreview';
import OfferForm from '../forms/OfferForm';
import {
  AggregateEvent,
  FeedCardAttributes,
  FeedItem,
  FeedQueryEvent,
  generateFeedCardAtributes,
  getHandle,
  User,
} from './feed.utils';
import BuyForm from '../forms/BuyForm';
import { TailSpin } from 'react-loader-spinner';

function AggregateCard(props: { event: AggregateEvent }) {
  const [modalOpen, setModalOpen] = useState(false);

  // return (
  //   <div className="relative  flex -space-x-96 -space-y-4  ">
  //     {props.event.eventsAggregated.slice(1, 5).map((e, i, l) => (
  //       // <FeedCard
  //       //   event={e}
  //       //   key={e.feedEventId}
  //       //   anchorWallet={props.anchorWallet}
  //       //   className={` hover:z-50 z-${(l.length - i) * 10}  `}
  //       // />
  //       <img
  //         key={e.feedEventId}
  //         className={classNames(
  //           ` hover:z-50 z-${(l.length - i) * 10}  `,
  //           'aspect-square w-full rounded-lg '
  //         )}
  //         src={e.nft?.image}
  //         alt={e.nft?.name}
  //       />
  //     ))}
  //   </div>
  // );

  return (
    <div
      className={classNames(
        'flex flex-wrap items-center rounded-full bg-gray-800 p-4 shadow-2xl shadow-black',
        false && 'hover:scale-[1.02]'
      )}
    >
      <div className="mx-auto flex justify-center sm:mx-0">
        and {props.event.eventsAggregated.length - 1} similar events
      </div>
      <Button5 className="ml-auto w-full sm:w-auto" v="ghost" onClick={() => setModalOpen(true)}>
        View all
      </Button5>
      {ReactDom.createPortal(
        <Modal
          open={modalOpen}
          setOpen={setModalOpen}
          title={'Aggregate (' + props.event.eventsAggregated.length + ')'}
        >
          <div className="space-y-10 p-4">
            {props.event.eventsAggregated.map((e) => (
              <FeedCard event={e} key={e.feedEventId} />
            ))}
          </div>
        </Modal>,
        document.getElementsByTagName('body')[0]!
      )}
    </div>
  );
}

export function FeedCard(props: {
  event: FeedItem;
  marketplace?: Marketplace;
  myFollowingList?: string[];
  className?: string;
  refetch?: any;
}) {
  if (props.event.__typename === 'AggregateEvent') {
    return <AggregateCard event={props.event} />;
  }

  const attrs = generateFeedCardAtributes(props.event, props.myFollowingList);
  // console.log('Feed card', props.event.feedEventId, {
  //   event: props.event,
  //   attrs,
  // });

  if (!attrs) return <div>Can not describe {props.event.__typename} </div>;

  if (props.event.__typename === 'FollowEvent')
    return <FollowCard attrs={attrs} event={props.event} myFollowingList={props.myFollowingList} />;

  if (!attrs.nft) return <div>{props.event.__typename} is malformed</div>;

  return (
    <div
      id={props.event.feedEventId}
      className={classNames('group relative transition-all  hover:scale-[1.02] ', props.className)}
    >
      <Link href={'/nfts/' + attrs.nft.address} passHref>
        <a>
          <img
            className="aspect-square w-full rounded-lg object-cover "
            src={attrs.nft?.image}
            alt={attrs.nft?.name}
          />
        </a>
      </Link>
      <ShareMenu className="absolute top-4 right-4 " address={attrs.nft.address} />
      <div className="absolute bottom-0 left-0 right-0 flex items-center p-4 text-base">
        <FeedActionBanner
          event={props.event}
          marketplace={props.marketplace}
          refetch={props.refetch}
        />
      </div>
    </div>
  );
}

function FollowCard(props: {
  event: FeedQueryEvent;
  attrs: FeedCardAttributes;
  myFollowingList?: string[];
  className?: string;
}) {
  const myFollowingList = props.myFollowingList || [];
  const attrs = props.attrs;
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const walletConnectionPair = useMemo(
    () => ({ wallet: anchorWallet!, connection }),
    [anchorWallet, connection]
  );

  if (!attrs) return <div>Not enough data</div>;

  return (
    <div
      className={classNames(
        'flex flex-wrap items-center rounded-3xl bg-gray-900 p-4 shadow-2xl shadow-black md:rounded-full',
        false && 'hover:scale-[1.02]',
        props.className
      )}
    >
      <ProfilePFP
        user={{
          address: props.event.walletAddress, // props.event.walletAddress,
          profile: props.event.profile,
        }}
      />
      <div className="ml-4">
        <div className="text-base font-semibold">
          {/* {attrs.content} */}
          {/* Started following
              {attrs.toUser?.profile?.handle || shortenAddress(attrs.toUser.address)} */}
          Followed{' '}
          {/* <Link href={'/profiles/' + attrs.toUser?.address}>
            <a target="_blank">{getHandle(attrs.toUser!)}</a>
          </Link> */}
          <ProfileHandle address={attrs.toUser!.address} />
        </div>
        <div className="flex space-x-4 text-sm">
          {/*           <Link href={'/profiles/' + attrs.sourceUser.address + '/nfts'} passHref>
            <a target="_blank" className="font-medium">
              {getHandle({
                address: props.event.walletAddress,
                profile: props.event.profile,
              })}
            </a>
          </Link> */}
          <ProfileHandle address={props.event.walletAddress} />
          <span>{DateTime.fromISO(attrs.createdAt).toRelative()}</span>
        </div>
      </div>
      {walletConnectionPair.wallet && (
        <div className="mt-4 w-full sm:ml-auto sm:mt-0 sm:w-auto">
          <FollowUnfollowButton
            source="feed"
            className="!w-full sm:ml-auto sm:w-auto"
            walletConnectionPair={walletConnectionPair}
            toProfile={{
              address: attrs.toUser!.address,
            }}
            type={myFollowingList.includes(attrs.toUser!.address) ? 'Unfollow' : 'Follow'} // needs to be dynamic
          />
        </div>
      )}
    </div>
  );
}

export const ProfileHandle = (props: { address: string }) => {
  const { data: twitterHandle } = useTwitterHandle(null, props.address);

  return (
    <Link href={'/profiles/' + props.address + '/nfts'} passHref>
      <a>{(twitterHandle && '@' + twitterHandle) || shortenAddress(props.address)}</a>
    </Link>
  );
};

function FeedActionBanner(props: {
  event: FeedQueryEvent; //  Omit<FeedQueryEvent, 'FollowEvent' | 'AggregateEvent'>;
  marketplace?: Marketplace;
  refetch?: any;
}) {
  const attrs = generateFeedCardAtributes(props.event);
  const anchorWallet = useAnchorWallet();

  if (!attrs?.sourceUser) return <div>Can not describe {props.event.__typename} </div>;

  return (
    <div className="flex w-full flex-wrap items-center rounded-3xl bg-gray-900/40 p-2 backdrop-blur-[200px] transition-all group-hover:bg-gray-900 sm:rounded-full">
      <ProfilePFP
        user={{
          address: props.event.walletAddress,
          profile: props.event.profile,
        }}
      />
      <div className="ml-2">
        <div className="text-base font-semibold">{attrs.content}</div>
        <div className="flex text-sm">
          {/* {getHandle(attrs.sourceUser)}  */}
          <ProfileHandle address={attrs.sourceUser.address} />
          &nbsp;
          {DateTime.fromISO(attrs.createdAt).toRelative()}
        </div>
      </div>

      <div className="ml-auto mt-4 w-full sm:mt-0 sm:w-auto ">
        {props.event.__typename === 'ListingEvent' ? (
          <PurchaseAction listingEvent={props.event as ListingEvent} nft={attrs.nft} />
        ) : props.event.walletAddress === anchorWallet?.publicKey.toBase58() ? null : ( // update offer
          <OfferAction nft={attrs.nft} />
        )}
      </div>
    </div>
  );
}

const PurchaseAction = (props: { listingEvent: ListingEvent; nft: any }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const [callMarketplaceQuery, marketplaceQuery] = useNftMarketplaceLazyQuery({
    variables: {
      subdomain: HOLAPLEX_MARKETPLACE_SUBDOMAIN,
      address: props.nft!.address!,
    },
  });

  useEffect(() => {
    if (modalOpen) {
      callMarketplaceQuery();
    }
  }, [modalOpen]);

  return (
    <>
      <Link href={'/nfts/' + props.nft.address} passHref>
        <a target="_blank">
          {/* Buy in feed context onClick={() => setModalOpen(true)} */}
          <Button5 v="primary" className="w-full sm:w-auto">
            Buy now
          </Button5>
        </a>
      </Link>
      {ReactDom.createPortal(
        <Modal title={`Make an offer`} open={modalOpen} setOpen={setModalOpen}>
          {props.nft! && <NFTPreview loading={false} nft={props.nft as Nft | any} />}

          {marketplaceQuery.data && (
            <div className={`mt-8 flex w-full`}>
              <BuyForm
                // @ts-ignore
                listing={props.listingEvent.listing!}
                nft={marketplaceQuery.data.nft as any}
                marketplace={marketplaceQuery.data.marketplace as Marketplace}
                refetch={() => {
                  marketplaceQuery.refetch();
                  setModalOpen(false);
                }}
              />
            </div>
          )}
        </Modal>,
        document.getElementsByTagName('body')[0]!
      )}
    </>
  );
};

const OfferAction = (props: { nft: any }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const [callMarketplaceQuery, marketplaceQuery] = useNftMarketplaceLazyQuery({
    variables: {
      subdomain: HOLAPLEX_MARKETPLACE_SUBDOMAIN,
      address: props.nft!.address!,
    },
  });

  useEffect(() => {
    if (modalOpen && !marketplaceQuery.called) {
      callMarketplaceQuery();
    }
  }, [modalOpen]);

  return (
    <>
      <Button5 v="primary" onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
        Make offer
      </Button5>
      {ReactDom.createPortal(
        <Modal title={`Make an offer`} open={modalOpen} setOpen={setModalOpen}>
          {props.nft! && <NFTPreview loading={false} nft={props.nft as Nft | any} />}
          {marketplaceQuery.loading && (
            <div className="flex justify-center">
              <TailSpin color={`grey`} />
            </div>
          )}
          {marketplaceQuery.data && (
            <div className={`mt-8 flex w-full`}>
              <OfferForm
                nft={marketplaceQuery.data.nft as any}
                marketplace={marketplaceQuery.data.marketplace as Marketplace}
                refetch={() => {
                  marketplaceQuery.refetch();
                  setModalOpen(false);
                }}
                reroute={false}
              />
            </div>
          )}
        </Modal>,
        document.getElementsByTagName('body')[0]!
      )}
    </>
  );
};

export function ProfilePFP({ user }: { user: User }) {
  // some of these hooks could probably be lifted up, but keeping it here for simplicity
  const { connection } = useConnection();
  const [twitterHandle, setTwitterHandle] = useState<string | undefined>();
  /* user.profile?.handle */
  const [pfpUrl, setPfpUrl] = useState(
    /* user.profile?.profileImageUrl ||  */
    getPFPFromPublicKey(user.address)
  );
  useEffect(() => {
    if (!twitterHandle) {
      getTwitterHandle(user.address, connection).then((twitterHandle) => {
        if (twitterHandle) setTwitterHandle(twitterHandle);
      });
    }
  }, []);

  const [walletProfileQuery, walletProfile] = useWalletProfileLazyQuery({
    variables: {
      handle: twitterHandle ?? '',
    },
  });

  useEffect(() => {
    if (
      twitterHandle
      /*     && !user.profile?.profileImageUrl */
    ) {
      walletProfileQuery().then((q) => {
        if (q.data?.profile?.profileImageUrlLowres) {
          setPfpUrl(q.data?.profile?.profileImageUrlLowres);
        }
      });
    }
  }, [twitterHandle]);

  // const { data: twitterHandle } = useTwitterHandle(null, user.address);

  return (
    <Link href={'/profiles/' + user.address + '/nfts'} passHref>
      <a target="_blank">
        <img
          className={classNames('rounded-full', 'h-10 w-10')}
          src={walletProfile.data?.profile?.profileImageUrlLowres || pfpUrl}
          alt={'profile picture for ' + user.profile?.handle || user.address}
        />
      </a>
    </Link>
  );
}

function ShareMenu(props: { address: string; className: string }) {
  return (
    <div className={props.className}>
      <MoreDropdown
        address={props.address}
        triggerButtonExtraClassNames="bg-gray-900/40 backdrop-blur-3xl group-hover:bg-gray-900"
      />
    </div>
  );
}
