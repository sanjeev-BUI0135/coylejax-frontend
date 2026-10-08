const formatUSPhone = (phone) => {
    if (!phone) return 'N/A';

    // remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // ensure it's 10 digits
    if (cleaned.length !== 10) return phone;

    const area = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const line = cleaned.slice(6);

    return `(${area}) ${prefix}-${line}`;
};

export default formatUSPhone;