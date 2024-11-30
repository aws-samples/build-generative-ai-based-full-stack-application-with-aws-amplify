import {
    Box, Header, SpaceBetween,
    Pagination, Table,
} from "@cloudscape-design/components";
import { useCollection } from '@cloudscape-design/collection-hooks';
import { useEffect, useState } from "react";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

const TableEmptyState = () => (
    <SpaceBetween size="l">
        <Box
            margin={{ vertical: 'xs' }}
            fontSize="heading-s"
            textAlign="center"
            color="inherit"
        >
            No Learning Activities
        </Box>
    </SpaceBetween>
);

const client = generateClient<Schema>();

function Rewards({ onPointsUpdate }: {onPointsUpdate: any }) {
    const [rewards, setRewards] = useState<Array<Schema["Reward"]["type"]>>([]);
    const [classes, setClasses] = useState<Record<string, Schema["Class"]["type"]>>({});

    const { items, collectionProps, paginationProps } = useCollection(
        rewards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        {
            filtering: {
                empty: <TableEmptyState />
            },
            pagination: { pageSize: 5 }
        }
    );

    const fetchClasses = async () => {
        try {
            const { data: classItems } = await client.models.Class.list();
            const classMap = classItems.reduce<Record<string, any>>((acc, cls) => {
                if (cls?.id) {
                    acc[cls.id] = cls;
                }
                return acc;
            }, {});
            setClasses(classMap);
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    const fetchRewards = async () => {
        try {
            const { data: points, errors } = await client.models.Reward.list();
            if (errors) throw errors;
            
            setRewards(points);
            const totalPoints = points.reduce((sum, reward) => sum + (reward.point || 0), 0);
            onPointsUpdate(totalPoints);
        } catch (error) {
            console.error("Error fetching rewards:", error);
            setRewards([]);
            onPointsUpdate(0);
        }
    };

    useEffect(() => {
        fetchRewards();
        fetchClasses();
    }, []);

    return (
        <Table
            {...collectionProps}
            items={items}
            columnDefinitions={[
                {
                    id: 'activity',
                    header: 'Learning Activity',
                    cell: item => classes[item?.classId ?? ""]?.name ?? 'Unknown Activity'
                },
                {
                    id: 'point',
                    header: 'Earned Points',
                    cell: item => item.point
                },
                {
                    id: 'date',
                    header: 'Completion Date',
                    cell: item => new Date(item.createdAt).toLocaleString('en-US', {
                        timeZone: 'America/Los_Angeles',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                },
            ]}
            empty={
                <Box
                    margin={{ vertical: "xs" }}
                    textAlign="center"
                    color="inherit"
                >
                    <SpaceBetween size="m">
                        <b>No Learning Activities Yet</b>
                    </SpaceBetween>
                </Box>
            }
            header={
                <Header 
                    description="Track your learning progress and earned points"
                    counter={rewards.length ? `(${rewards.length})` : undefined}
                >
                    Learning History
                </Header>
            }
            pagination={<Pagination {...paginationProps} />}
        />
    );
}

export { Rewards };